import { useEffect, useState } from 'react';
import { api, errMsg } from '../../api';
import PizzaImage from '../../PizzaImage';
import toast from 'react-hot-toast';

export default function AdminImages() {
  const [pizzas,       setPizzas]       = useState(null);
  const [uploading,    setUploading]    = useState(null);
  const [error,        setError]        = useState('');
  const [cloudinaryOk, setCloudinaryOk] = useState(null); // null = unknown, true/false after check

  const load = () => api.get('/menu').then((r) => setPizzas(r.data.pizzas)).catch((e) => setError(errMsg(e)));
  useEffect(() => {
    load();
    // Check if Cloudinary is configured by probing the server status endpoint
    api.get('/images/status').then((r) => setCloudinaryOk(r.data.cloudinaryConfigured)).catch(() => setCloudinaryOk(false));
  }, []);

  const upload = async (pizzaId, file) => {
    if (!file) return;
    setUploading(pizzaId);
    try {
      const form = new FormData();
      form.append('image', file);
      const { data } = await api.post(`/images/pizza/${pizzaId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPizzas((prev) => prev.map((p) => p._id === pizzaId
        ? { ...p, image: { url: data.url, thumb: data.thumb, publicId: data.publicId, alt: data.alt } } : p));
      toast.success('Image uploaded!');
    } catch (e) { toast.error(errMsg(e)); }
    finally { setUploading(null); }
  };

  const removeImage = async (pizzaId) => {
    if (!confirm('Remove this image?')) return;
    try {
      await api.delete(`/images/pizza/${pizzaId}`);
      setPizzas((prev) => prev.map((p) => p._id === pizzaId ? { ...p, image: null } : p));
      toast.success('Image removed');
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl mb-1">Pizza Images</h1>
        <p className="text-mute text-sm">Upload and manage pizza photos · JPG, PNG, WebP · max 5 MB</p>
      </div>
      {cloudinaryOk === false && (
        <div className="card border-crust/30 bg-crust/5 p-4 text-sm">
          <p className="font-semibold">📷 Cloudinary not configured</p>
          <p className="text-mute mt-1">Add <code className="bg-line px-1 rounded">CLOUDINARY_CLOUD_NAME</code>, <code className="bg-line px-1 rounded">CLOUDINARY_API_KEY</code> and <code className="bg-line px-1 rounded">CLOUDINARY_API_SECRET</code> to your <code>.env</code> to enable uploads.</p>
        </div>
      )}
      {error && <p className="msg-error">{error}</p>}
      {!pizzas ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}</div> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pizzas.map((p) => (
            <div key={p._id} className="card overflow-hidden">
              <div className="relative">
                <PizzaImage src={p.image?.url} alt={p.name} className="w-full" aspectRatio="aspect-[4/3]" />
                {p.image?.url && (
                  <button onClick={() => removeImage(p._id)}
                    className="absolute top-2 right-2 rounded-full bg-tomato px-2 py-1 text-xs font-semibold text-white shadow hover:bg-tomato/90">
                    ✕ Remove
                  </button>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold truncate mb-1">{p.name}</p>
                <p className="text-xs text-mute mb-2">₹{p.price}</p>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-basil/40 bg-basil/5 px-3 py-2 text-sm text-basil hover:bg-basil/10 transition-colors">
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                    disabled={uploading === p._id}
                    onChange={(e) => upload(p._id, e.target.files?.[0])} />
                  {uploading === p._id ? <span className="animate-pulse">Uploading…</span>
                    : <span>{p.image?.url ? '🔄 Replace' : '📤 Upload image'}</span>}
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
