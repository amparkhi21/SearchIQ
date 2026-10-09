import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as reviewApi from '../../api/review.api';
import { errorMessage } from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/format';
import Rating from '../ui/Rating';
import Icon from '../ui/Icon';
import { RowSkeleton } from '../ui/Skeletons';
import { Spinner } from '../ui/Loader';

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="rounded p-0.5">
          <Icon name="star" className={`h-7 w-7 transition-colors ${n <= value ? 'text-amber-400' : 'text-ink-200 hover:text-amber-200'}`} filled strokeWidth={0} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewSection({ productId, ratingAvg = 0, ratingCount = 0, onChanged }) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [state, setState] = useState({ loading: true, reviews: [], error: '' });
  const [form, setForm] = useState({ rating: 0, title: '', body: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await reviewApi.listReviews(productId, { limit: 50 });
      setState({ loading: false, reviews: d.reviews || [], error: '' });
    } catch (e) {
      setState({ loading: false, reviews: [], error: errorMessage(e, 'Could not load reviews') });
    }
  }, [productId]);
  useEffect(() => { setState((s) => ({ ...s, loading: true })); load(); }, [load]);

  const mine = state.reviews.find((r) => r.user?.id && r.user.id === user?.id);
  const dist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    state.reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1] += 1; });
    return counts;
  }, [state.reviews]);
  const max = Math.max(1, ...dist);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.rating) errs.rating = 'Choose a star rating';
    if (form.body.trim().length < 5) errs.body = 'Write at least 5 characters';
    if (form.title && form.title.trim().length < 2) errs.title = 'Title must be at least 2 characters';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const payload = { rating: form.rating, body: form.body.trim(), ...(form.title.trim() ? { title: form.title.trim() } : {}) };
      if (mine) await reviewApi.updateReview(mine.id, payload); else await reviewApi.createReview(productId, payload);
      toast.success(mine ? 'Review updated' : 'Thanks for your review!');
      setShowForm(false);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save your review'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!mine || !window.confirm('Delete your review?')) return;
    try { await reviewApi.deleteReview(mine.id); toast.success('Review deleted'); setShowForm(false); await load(); onChanged?.(); }
    catch (err) { toast.error(errorMessage(err, 'Could not delete review')); }
  };

  const openForm = () => {
    setForm(mine ? { rating: mine.rating, title: mine.title || '', body: mine.body || '' } : { rating: 0, title: '', body: '' });
    setErrors({});
    setShowForm(true);
  };

  return (
    <section id="reviews" className="mt-12 sm:mt-16" aria-labelledby="reviews-title">
      <p className="eyebrow mb-1">Customer feedback</p>
      <h2 id="reviews-title" className="section-title mb-6">Ratings & reviews</h2>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="card-pad h-fit">
          <div className="flex items-end gap-3">
            <span className="text-5xl font-extrabold tracking-tight">{Number(ratingAvg || 0).toFixed(1)}</span>
            <span className="pb-1.5 text-sm text-ink-500">out of 5</span>
          </div>
          <Rating value={ratingAvg} showValue={false} size="lg" className="mt-2" />
          <p className="mt-1 text-sm text-ink-500">{ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}</p>
          <div className="mt-5 space-y-2">
            {[5, 4, 3, 2, 1].map((n) => (
              <div key={n} className="flex items-center gap-2 text-xs text-ink-600">
                <span className="w-3 text-right font-medium">{n}</span>
                <Icon name="star" className="h-3 w-3 text-amber-400" filled strokeWidth={0} />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${state.reviews.length ? (dist[n - 1] / max) * 100 : 0}%` }} /></div>
                <span className="w-6 text-right tabular-nums text-ink-400">{dist[n - 1]}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-ink-100 pt-4">
            {isAuthenticated
              ? <button type="button" className="btn-secondary btn-block" onClick={openForm}>{mine ? 'Edit your review' : 'Write a review'}</button>
              : <Link to="/login" state={{ from: { pathname: window.location.pathname } }} className="btn-secondary btn-block">Sign in to review</Link>}
            <p className="mt-2 text-center text-xs text-ink-400">Reviews are limited to verified purchases.</p>
          </div>
        </div>

        <div className="min-w-0">
          {showForm && (
            <form onSubmit={submit} noValidate className="card-pad mb-5 space-y-4">
              <div>
                <span className="field-label">Your rating</span>
                <StarPicker value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} />
                {errors.rating && <p className="field-error">{errors.rating}</p>}
              </div>
              <div>
                <label htmlFor="rv-title" className="field-label">Title <span className="font-normal text-ink-400">(optional)</span></label>
                <input id="rv-title" className={`input ${errors.title ? 'input-error' : ''}`} maxLength={120} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                {errors.title && <p className="field-error">{errors.title}</p>}
              </div>
              <div>
                <label htmlFor="rv-body" className="field-label">Your review</label>
                <textarea id="rv-body" className={`input ${errors.body ? 'input-error' : ''}`} maxLength={2000} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="What did you like or dislike?" />
                {errors.body && <p className="field-error">{errors.body}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4" />}{mine ? 'Update review' : 'Submit review'}</button>
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                {mine && <button type="button" className="btn-danger ml-auto" onClick={remove}>Delete</button>}
              </div>
            </form>
          )}

          {state.loading ? <RowSkeleton rows={3} /> : state.error ? (
            <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{state.error}</p>
          ) : state.reviews.length === 0 ? (
            <div className="card-pad text-center text-sm text-ink-500">No reviews yet — be the first to share your experience.</div>
          ) : (
            <ul className="space-y-4">
              {state.reviews.map((r) => (
                <li key={r.id} className="card-pad">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">{(r.user?.name || 'C')[0].toUpperCase()}</span>
                      <div>
                        <p className="text-sm font-semibold">{r.user?.name || 'Customer'}{r.user?.id === user?.id && <span className="badge-brand ml-2">You</span>}</p>
                        <p className="text-xs text-ink-400">{formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <Rating value={r.rating} showValue={false} />
                  </div>
                  {r.title && <h3 className="mt-3 text-sm font-semibold">{r.title}</h3>}
                  <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-ink-600">{r.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
