import { v2 as cloudinary } from 'cloudinary';

// Configure only when credentials are present
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export default cloudinary;

/** Upload a buffer to Cloudinary and return { url, thumb, publicId }
 *  Falls back gracefully if Cloudinary is not configured.
 */
export async function uploadImage(buffer, folder = 'tosswell/pizzas', oldPublicId = null) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env');
  }

  // Delete old image if replacing
  if (oldPublicId) {
    await cloudinary.uploader.destroy(oldPublicId).catch(() => {});
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      },
      (error, result) => {
        if (error) return reject(error);
        // Build a 400×300 thumbnail URL using Cloudinary transformations
        const thumb = cloudinary.url(result.public_id, {
          width: 400, height: 300, crop: 'fill', quality: 'auto', fetch_format: 'auto',
        });
        resolve({ url: result.secure_url, thumb, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

export async function deleteImage(publicId) {
  if (!publicId || !process.env.CLOUDINARY_CLOUD_NAME) return;
  await cloudinary.uploader.destroy(publicId).catch(() => {});
}
