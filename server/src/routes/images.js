import { Router } from 'express';
import multer from 'multer';
import { Pizza } from '../models.js';
import { auth, httpError } from '../middleware.js';
import { uploadImage, deleteImage } from '../cloudinary.js';

const r = Router();

// Store upload in memory (max 5 MB), validate mime type
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, and WebP images are allowed'));
  },
});

// GET /api/images/status — reports whether Cloudinary is configured (admin only)
r.get('/status', auth('admin'), (_req, res) => {
  res.json({ cloudinaryConfigured: !!process.env.CLOUDINARY_CLOUD_NAME });
});

// POST /api/images/pizza/:id — upload / replace pizza image (admin only)
r.post('/pizza/:id', auth('admin'), upload.single('image'), async (req, res) => {
  if (!req.file) throw httpError(400, 'No image file provided');

  const pizza = await Pizza.findById(req.params.id);
  if (!pizza) throw httpError(404, 'Pizza not found');

  const oldPublicId = pizza.image?.publicId || null;
  const { url, thumb, publicId } = await uploadImage(req.file.buffer, 'tosswell/pizzas', oldPublicId);

  pizza.image = {
    url,
    thumb,
    publicId,
    alt: pizza.name,
  };
  await pizza.save();

  res.json({ url, thumb, publicId, alt: pizza.name });
});

// DELETE /api/images/pizza/:id — remove pizza image (admin only)
r.delete('/pizza/:id', auth('admin'), async (req, res) => {
  const pizza = await Pizza.findById(req.params.id);
  if (!pizza) throw httpError(404, 'Pizza not found');

  if (pizza.image?.publicId) {
    await deleteImage(pizza.image.publicId);
  }
  pizza.image = undefined;
  await pizza.save();

  res.json({ message: 'Image removed' });
});

export default r;
