import nodemailer from 'nodemailer';

const port = Number(process.env.SMTP_PORT) || 587;

const transport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function sendMail({ to, subject, text, html }) {
  if (!transport) {
    console.log(`\n[mail:dev] To: ${to}\nSubject: ${subject}\n${text || ''}\n`);
    return;
  }
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    // Email failures must never break the main flow — log and continue
    console.error('[mailer] Failed to send email to', to, ':', err.message);
  }
}

// ── Order confirmation email ─────────────────────────────────────────────────
export function orderConfirmationEmail(order, userName) {
  const rows = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #d8dcd0">${it.qty} × ${it.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #d8dcd0;text-align:right">₹${it.price * it.qty}</td>
      </tr>`,
    )
    .join('');

  const addressHtml = order.address?.line1
    ? `<p style="margin:4px 0">${order.address.line1}${order.address.line2 ? ', ' + order.address.line2 : ''}<br>
       ${order.address.city}, ${order.address.state} - ${order.address.pincode}</p>`
    : '';

  const discountRow =
    order.discount > 0
      ? `<tr><td style="padding:8px 12px;color:#1f5c3a">Discount (${order.coupon})</td>
           <td style="padding:8px 12px;text-align:right;color:#1f5c3a">-₹${order.discount}</td></tr>`
      : '';

  const eta = order.estimatedDelivery
    ? `<p style="margin:4px 0"><strong>Estimated delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:'Figtree',Arial,sans-serif;background:#f6f7f2;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #d8dcd0">
    <div style="background:#1f5c3a;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:24px">🍕 Tosswell Pizza</h1>
      <p style="color:#a7c4b5;margin:4px 0 0">Order Confirmed</p>
    </div>
    <div style="padding:24px 32px">
      <p style="font-size:16px">Hi <strong>${userName}</strong>, your order is confirmed!</p>
      <p style="color:#5d6b62;font-size:14px">Order ID: <strong>#${String(order._id).slice(-6).toUpperCase()}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f6f7f2">
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#5d6b62">Item</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#5d6b62">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          ${discountRow}
          <tr style="background:#f6f7f2">
            <td style="padding:12px;font-weight:700">Total Paid</td>
            <td style="padding:12px;text-align:right;font-weight:700;color:#1f5c3a">₹${order.total}</td>
          </tr>
        </tfoot>
      </table>
      ${order.address?.line1 ? `<div style="margin:16px 0"><strong>Delivery address:</strong>${addressHtml}</div>` : ''}
      ${eta}
      <p style="color:#5d6b62;font-size:13px;margin-top:24px">
        Track your order at <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/orders" style="color:#1f5c3a">My Orders</a>.
      </p>
    </div>
    <div style="background:#f6f7f2;padding:16px 32px;text-align:center;font-size:12px;color:#5d6b62">
      © Tosswell Pizza · This is an automated confirmation email.
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${userName}, your Tosswell Pizza order #${String(order._id).slice(-6).toUpperCase()} is confirmed!\n\nItems:\n${order.items.map((i) => `  ${i.qty} × ${i.name}  ₹${i.price * i.qty}`).join('\n')}\n\nTotal paid: ₹${order.total}\n\nTrack at: ${process.env.CLIENT_URL || 'http://localhost:5173'}/orders`;

  return { subject: `Order confirmed – #${String(order._id).slice(-6).toUpperCase()} 🍕`, html, text };
}

// ── Status update email ───────────────────────────────────────────────────────
export function orderStatusEmail(order, userName, status) {
  const messages = {
    Preparing: 'Your pizza is in the oven! 🔥',
    'Out for Delivery': 'Your order is on its way! 🛵',
    Delivered: 'Your order has been delivered. Enjoy! 🍕',
    Cancelled: 'Your order has been cancelled.',
  };
  const msg = messages[status] || `Your order status is now: ${status}`;
  const html = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f6f7f2;padding:20px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #d8dcd0">
    <h2 style="color:#1f5c3a">🍕 Tosswell Pizza</h2>
    <p>Hi <strong>${userName}</strong>,</p>
    <p style="font-size:18px">${msg}</p>
    <p style="color:#5d6b62">Order: <strong>#${String(order._id).slice(-6).toUpperCase()}</strong></p>
    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/orders" style="display:inline-block;margin-top:16px;background:#1f5c3a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Track Order</a>
  </div>
</body></html>`;
  return { subject: `Order #${String(order._id).slice(-6).toUpperCase()} – ${status}`, html, text: `Hi ${userName}, ${msg} Order: #${String(order._id).slice(-6).toUpperCase()}` };
}
