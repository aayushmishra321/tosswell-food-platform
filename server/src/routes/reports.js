import { Router } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { Order, Inventory, Coupon, StockMovement } from '../models.js';
import { auth } from '../middleware.js';

const r = Router();
r.use(auth('admin'));

// ── GET /api/reports/orders.csv ───────────────────────────────────────────────
r.get('/orders.csv', async (req, res) => {
  const { from, to, status } = req.query;
  const filter = { status: { $ne: 'Awaiting Payment' } };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  const rows = [
    ['Order ID','Customer','Email','Status','Subtotal','Discount','Total','Coupon','Date','Address'].join(','),
    ...orders.map((o) => [
      String(o._id).slice(-6).toUpperCase(),
      `"${o.user?.name || ''}"`,
      o.user?.email || '',
      o.status,
      o.subtotal,
      o.discount || 0,
      o.total,
      o.coupon || '',
      new Date(o.createdAt).toISOString().slice(0, 10),
      o.address ? `"${o.address.line1}, ${o.address.city}"` : '',
    ].join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
  res.send(rows);
});

// ── GET /api/reports/orders.xlsx ──────────────────────────────────────────────
r.get('/orders.xlsx', async (req, res) => {
  const { from, to, status } = req.query;
  const filter = { status: { $ne: 'Awaiting Payment' } };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tosswell Pizza';
  const ws = wb.addWorksheet('Orders');

  ws.columns = [
    { header: 'Order ID',   key: 'id',       width: 12 },
    { header: 'Customer',   key: 'customer',  width: 20 },
    { header: 'Email',      key: 'email',     width: 28 },
    { header: 'Status',     key: 'status',    width: 18 },
    { header: 'Subtotal',   key: 'subtotal',  width: 12 },
    { header: 'Discount',   key: 'discount',  width: 12 },
    { header: 'Total (₹)',  key: 'total',     width: 12 },
    { header: 'Coupon',     key: 'coupon',    width: 14 },
    { header: 'Date',       key: 'date',      width: 14 },
    { header: 'City',       key: 'city',      width: 16 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5C3A' } };
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  for (const o of orders) {
    ws.addRow({
      id:       String(o._id).slice(-6).toUpperCase(),
      customer: o.user?.name || '',
      email:    o.user?.email || '',
      status:   o.status,
      subtotal: o.subtotal,
      discount: o.discount || 0,
      total:    o.total,
      coupon:   o.coupon || '',
      date:     new Date(o.createdAt).toLocaleDateString('en-IN'),
      city:     o.address?.city || '',
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

// ── GET /api/reports/invoice/:orderId — PDF invoice ───────────────────────────
r.get('/invoice/:orderId', async (req, res) => {
  const order = await Order.findById(req.params.orderId)
    .populate('user', 'name email phone')
    .lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${String(order._id).slice(-6).toUpperCase()}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(22).fillColor('#1f5c3a').text('Tosswell Pizza', 50, 50);
  doc.fontSize(10).fillColor('#5d6b62').text('tosswellpizza@gmail.com', 50, 78);
  doc.moveDown();

  // Invoice title
  doc.fontSize(16).fillColor('#1a2419').text('TAX INVOICE', { align: 'right' });
  doc.fontSize(10).fillColor('#5d6b62')
    .text(`Invoice #: ${String(order._id).slice(-6).toUpperCase()}`, { align: 'right' })
    .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, { align: 'right' });

  doc.moveTo(50, 140).lineTo(545, 140).strokeColor('#e2e5d8').stroke();
  doc.moveDown();

  // Bill to
  doc.fontSize(10).fillColor('#5d6b62').text('Bill To:');
  doc.fontSize(11).fillColor('#1a2419')
    .text(order.user?.name || 'Customer')
    .text(order.user?.email || '');
  if (order.address?.line1) {
    doc.text(`${order.address.line1}${order.address.line2 ? ', ' + order.address.line2 : ''}`)
       .text(`${order.address.city}, ${order.address.state} - ${order.address.pincode}`);
  }

  doc.moveDown();

  // Items table header
  const tableTop = doc.y;
  doc.rect(50, tableTop, 495, 20).fillColor('#1f5c3a').fill();
  doc.fillColor('#ffffff').fontSize(10)
    .text('Item',     60,  tableTop + 5)
    .text('Qty',      300, tableTop + 5)
    .text('Unit Price', 350, tableTop + 5)
    .text('Amount',   460, tableTop + 5);

  let y = tableTop + 25;
  doc.fillColor('#1a2419');

  for (const item of order.items) {
    doc.fontSize(10)
      .text(item.name,            60,  y)
      .text(String(item.qty),     300, y)
      .text(`₹${item.price}`,    350, y)
      .text(`₹${item.price * item.qty}`, 460, y);
    y += 20;
    if (y > 700) { doc.addPage(); y = 50; }
  }

  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e5d8').stroke();
  y += 10;

  // Totals
  const totals = [
    ['Subtotal:', `₹${order.subtotal}`],
    ...(order.discount > 0 ? [`Coupon (${order.coupon || ''})`, `-₹${order.discount}`] : []).map(v => [v[0], v[1]]),
    ...(order.deliveryFee > 0 ? [['Delivery Fee:', `₹${order.deliveryFee}`]] : []),
    ['Total Paid:', `₹${order.total}`],
  ];

  for (const [label, value] of totals) {
    const isBold = label.startsWith('Total');
    doc.fontSize(isBold ? 12 : 10)
       .fillColor(isBold ? '#1f5c3a' : '#1a2419')
       .text(label, 380, y, { width: 100, align: 'right' })
       .text(value, 460, y, { width: 85,  align: 'right' });
    y += 18;
  }

  if (order.paymentId) {
    doc.moveDown().fontSize(9).fillColor('#5d6b62')
      .text(`Payment ID: ${order.paymentId}`, 50, y + 10);
  }

  doc.fontSize(9).fillColor('#5d6b62')
    .text('Thank you for ordering with Tosswell Pizza!', 50, 760, { align: 'center' });

  doc.end();
});

// ── GET /api/reports/inventory.csv ────────────────────────────────────────────
r.get('/inventory.csv', async (_req, res) => {
  const items = await Inventory.find().sort({ category: 1, name: 1 }).lean();
  const rows = [
    ['Category', 'Name', 'Price (₹)', 'In Stock', 'Threshold', 'Status'].join(','),
    ...items.map((i) => [
      i.category, `"${i.name}"`, i.price, i.stock, i.threshold,
      i.stock === 0 ? 'Out of Stock' : i.stock < i.threshold ? 'Low Stock' : 'OK',
    ].join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
  res.send(rows);
});

// ── GET /api/reports/stock-history/:inventoryId ───────────────────────────────
r.get('/stock-history/:id', async (req, res) => {
  const history = await StockMovement.find({ inventory: req.params.id })
    .sort({ createdAt: -1 }).limit(100).lean();
  res.json(history);
});

export default r;
