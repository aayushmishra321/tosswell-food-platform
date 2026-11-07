import { useEffect, useState } from 'react';
import { api, errMsg } from '../../api';
import toast from 'react-hot-toast';

export default function AdminReviews() {
  const [reviews, setReviews] = useState(null);
  const [error,   setError]   = useState('');

  const load = () => api.get('/admin/reviews').then((r) => setReviews(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const toggle = async (id, visible) => {
    await api.patch(`/admin/reviews/${id}`, { visible });
    await load();
    toast.success(visible ? 'Review shown' : 'Review hidden');
  };

  const sentimentColor = { Positive: 'badge-green', Neutral: 'badge-gray', Negative: 'badge-red' };

  return (
    <div className="space-y-5">
      <div><h1 className="text-3xl mb-1">Reviews</h1><p className="text-mute text-sm">Moderate customer reviews</p></div>
      {error && <p className="msg-error">{error}</p>}
      {!reviews ? <div className="skeleton h-64 rounded-2xl" /> :
        reviews.length === 0 ? <div className="card p-12 text-center text-mute">No reviews yet</div> : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r._id} className={`card p-4 ${!r.visible ? 'opacity-50' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-semibold">{r.user?.name}</span>
                    <span className="ml-2 text-sm text-mute">{r.user?.email}</span>
                    <span className="ml-2 stars text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.sentiment && <span className={`badge ${sentimentColor[r.sentiment] || 'badge-gray'}`}>{r.sentiment}</span>}
                    <span className="text-xs text-mute">{new Date(r.createdAt).toLocaleDateString()}</span>
                    <button className="btn-quiet text-xs" onClick={() => toggle(r._id, !r.visible)}>
                      {r.visible ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                {r.comment && <p className="text-sm text-mute">{r.comment}</p>}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
