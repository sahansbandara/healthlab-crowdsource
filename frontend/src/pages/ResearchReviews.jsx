import React, { useState, useEffect } from 'react';
import api from '../api/api';
import reviewHeroBg from '../assets/images/Review_Publish_Image.png';

const ResearchReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [form, setForm] = useState({
        title: '',
        summary: '',
        content: '',
        status: 'draft',
    });

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                setLoading(true);
                setError('');
                const res = await api.get('/reviews');
                const items = res.data?.data?.items || [];
                setReviews(items);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load reviews.');
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm({
            title: '',
            summary: '',
            content: '',
            status: 'draft',
        });
        setFormOpen(true);
    };

    const openEdit = (review) => {
        setEditingId(review._id);
        setForm({
            title: review.title || '',
            summary: review.summary || review.abstract || '',
            content: review.content || '',
            status: review.status || 'draft',
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingId(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/reviews/${editingId}`, {
                    title: form.title.trim(),
                    summary: form.summary.trim(),
                    content: form.content.trim(),
                    status: form.status,
                });
            } else {
                await api.post('/reviews', {
                    title: form.title.trim(),
                    summary: form.summary.trim(),
                    content: form.content.trim(),
                    status: form.status,
                });
            }
            closeForm();
            const res = await api.get('/reviews');
            const items = res.data?.data?.items || [];
            setReviews(items);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save review.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this review?')) return;
        try {
            setDeletingId(id);
            setError('');
            await api.delete(`/reviews/${id}`);
            setReviews((prev) => prev.filter((r) => r._id !== id));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete review.');
        } finally {
            setDeletingId(null);
        }
    };

    const statusBadgeClass = (status) => {
        const s = String(status || '').toLowerCase();
        if (s === 'published') return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';
        return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
                    <div className="mt-4 space-y-3">
                        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
                        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                    </div>
                    <p className="mt-4 text-sm text-slate-500">Loading your research reviews...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <section className="relative mb-8 overflow-hidden rounded-2xl border border-white/20 bg-slate-950 shadow-lg" aria-labelledby="research-reviews-heading">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${reviewHeroBg})` }}
                    aria-hidden
                />
                <div className="absolute inset-0 bg-black/40" aria-hidden />
                <div className="relative z-10 flex min-h-[220px] max-w-2xl flex-col justify-center gap-2 px-6 py-10 sm:min-h-[260px] sm:px-10">
                    <h1 id="research-reviews-heading" className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                        Research Reviews
                    </h1>
                    <p className="text-sm leading-relaxed text-slate-100/90 sm:text-base">
                        Create, edit, and publish summaries of your research findings.
                    </p>
                    <div className="mt-4">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            onClick={openCreate}
                        >
                            + New Review
                        </button>
                    </div>
                </div>
            </section>

            {error && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {error}
                </div>
            )}

            {reviews.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
                    You have no research reviews yet. Create one to get started.
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                <th className="whitespace-nowrap px-5 py-4">Title</th>
                                <th className="whitespace-nowrap px-5 py-4">Status</th>
                                <th className="whitespace-nowrap px-5 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.map((review) => (
                                <tr key={review._id} className="border-t border-slate-100 hover:bg-slate-50/70">
                                    <td className="max-w-[28rem] px-5 py-4 font-medium text-slate-900">
                                        <div className="truncate" title={review.title}>{review.title}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadgeClass(review.status)}`}>
                                            {review.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                            onClick={() => openEdit(review)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                                            onClick={() => handleDelete(review._id)}
                                            disabled={deletingId === review._id}
                                        >
                                            {deletingId === review._id ? 'Deleting...' : 'Delete'}
                                        </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            {formOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={closeForm}>
                    <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Review' : 'New Review'}</h2>
                            <button
                                type="button"
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                onClick={closeForm}
                                aria-label="Close"
                            >
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-6 py-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-800">Title</label>
                                    <input
                                        name="title"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        value={form.title}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-800">Summary</label>
                                    <textarea
                                        name="summary"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        rows={3}
                                        value={form.summary}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-800">Content</label>
                                    <textarea
                                        name="content"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        rows={6}
                                        value={form.content}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-800">Status</label>
                                    <select
                                        name="status"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        value={form.status}
                                        onChange={handleChange}
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                    </select>
                                </div>
                                <div className="flex flex-wrap justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-300"
                                        onClick={closeForm}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Saving...' : 'Save Review'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResearchReviews;

