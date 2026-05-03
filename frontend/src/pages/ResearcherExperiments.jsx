import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import researcherHeroBg from '../assets/images/Researcher Background_One.png';

const STATUS_OPTIONS = ['draft', 'published', 'closed'];

// Auto-generate a safe key from a label
function generateKey(label) {
    return label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .split(' ')
        .filter(Boolean)
        .map((word, index) =>
            index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join('');
}

const ResearcherExperiments = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user._id || user.id;

    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [viewingId, setViewingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [generatingAiSummaryId, setGeneratingAiSummaryId] = useState(null);
    const [form, setForm] = useState({
        title: '',
        description: '',
        status: 'draft',
        participantLimit: 0,
        startDate: '',
        endDate: '',
        applicationDeadline: '',
        conflictTagsInput: '',
        aiSummary: '',
        aiSummaryUpdatedAt: null,
        logFieldDefinitions: [
            {
                label: '',
                key: '',
                type: 'text',
                required: false,
                unit: '',
                optionsInput: '',
            },
        ],
    });

    useEffect(() => {
        if (!userId || (user.role || '').toLowerCase() !== 'researcher') {
            navigate('/login');
            return;
        }
        fetchExperiments();
    }, [userId, user.role]);

    const fetchExperiments = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await api.get('/experiments');
            const mine = Array.isArray(data) ? data.filter((e) => String(e.ownerId) === String(userId)) : [];
            setExperiments(mine);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load experiments.');
            setExperiments([]);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setViewingId(null);
        setForm({
            title: '',
            description: '',
            status: 'draft',
            participantLimit: 0,
            startDate: '',
            endDate: '',
            applicationDeadline: '',
            conflictTagsInput: '',
            aiSummary: '',
            aiSummaryUpdatedAt: null,
            logFieldDefinitions: [
                {
                    label: '',
                    key: '',
                    type: 'text',
                    required: false,
                    unit: '',
                    optionsInput: '',
                },
            ],
        });
        setFormOpen(true);
    };

    const openEdit = (exp) => {
        setEditingId(exp._id);
        setViewingId(null);
        setForm({
            title: exp.title || '',
            description: exp.description || '',
            status: exp.status || 'draft',
            participantLimit: exp.participantLimit ?? 0,
            startDate: exp.startDate ? exp.startDate.slice(0, 10) : '',
            endDate: exp.endDate ? exp.endDate.slice(0, 10) : '',
            applicationDeadline: exp.applicationDeadline ? exp.applicationDeadline.slice(0, 10) : '',
            conflictTagsInput: Array.isArray(exp.conflictTags) ? exp.conflictTags.join(', ') : '',
            aiSummary: exp.aiSummary || '',
            aiSummaryUpdatedAt: exp.aiSummaryUpdatedAt || null,
            logFieldDefinitions:
                Array.isArray(exp.logFieldDefinitions) && exp.logFieldDefinitions.length > 0
                    ? exp.logFieldDefinitions.map((f) => ({
                        label: f.label || '',
                        key: f.key || '',
                        type: f.type || 'text',
                        required: !!f.required,
                        unit: f.unit || '',
                        optionsInput: Array.isArray(f.options) ? f.options.join(', ') : '',
                    }))
                    : [
                        {
                            label: '',
                            key: '',
                            type: 'text',
                            required: false,
                            unit: '',
                            optionsInput: '',
                        },
                    ],
        });
        setFormOpen(true);
    };

    const openView = (exp) => {
        setViewingId(exp._id);
        setEditingId(null);
        setForm({
            title: exp.title || '',
            description: exp.description || '',
            status: exp.status || 'draft',
            participantLimit: exp.participantLimit ?? 0,
            startDate: exp.startDate ? exp.startDate.slice(0, 10) : '',
            endDate: exp.endDate ? exp.endDate.slice(0, 10) : '',
            applicationDeadline: exp.applicationDeadline ? exp.applicationDeadline.slice(0, 10) : '',
            conflictTagsInput: Array.isArray(exp.conflictTags) ? exp.conflictTags.join(', ') : '',
            aiSummary: exp.aiSummary || '',
            aiSummaryUpdatedAt: exp.aiSummaryUpdatedAt || null,
            logFieldDefinitions:
                Array.isArray(exp.logFieldDefinitions) && exp.logFieldDefinitions.length > 0
                    ? exp.logFieldDefinitions.map((f) => ({
                        label: f.label || '',
                        key: f.key || '',
                        type: f.type || 'text',
                        required: !!f.required,
                        unit: f.unit || '',
                        optionsInput: Array.isArray(f.options) ? f.options.join(', ') : '',
                    }))
                    : [
                        {
                            label: '',
                            key: '',
                            type: 'text',
                            required: false,
                            unit: '',
                            optionsInput: '',
                        },
                    ],
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingId(null);
        setViewingId(null);
        setDeleteConfirmId(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: name === 'participantLimit' ? (value === '' ? 0 : parseInt(value, 10) || 0) : value,
        }));
    };

    const handleLogFieldChange = (index, field, value) => {
        setForm((prev) => ({
            ...prev,
            logFieldDefinitions: prev.logFieldDefinitions.map((f, i) => {
                if (i !== index) return f;
                // When label changes, also regenerate the key automatically
                if (field === 'label') {
                    const newLabel = value;
                    const newKey = generateKey(newLabel);
                    return { ...f, label: newLabel, key: newKey };
                }
                return { ...f, [field]: value };
            }),
        }));
    };

    const handleLogFieldToggleRequired = (index) => {
        setForm((prev) => ({
            ...prev,
            logFieldDefinitions: prev.logFieldDefinitions.map((f, i) =>
                i === index ? { ...f, required: !f.required } : f
            ),
        }));
    };

    const addLogField = () => {
        setForm((prev) => ({
            ...prev,
            logFieldDefinitions: [
                ...prev.logFieldDefinitions,
                {
                    label: '',
                    key: '',
                    type: 'text',
                    required: false,
                    unit: '',
                    optionsInput: '',
                },
            ],
        }));
    };

    const removeLogField = (index) => {
        setForm((prev) => {
            if (prev.logFieldDefinitions.length === 1) return prev;
            return {
                ...prev,
                logFieldDefinitions: prev.logFieldDefinitions.filter((_, i) => i !== index),
            };
        });
    };

    const handleGenerateAiSummary = async () => {
        if (!viewingId) return;
        try {
            setGeneratingAiSummaryId(viewingId);
            setError('');
            const { data } = await api.post(`/experiments/${viewingId}/ai-summary`);
            setForm((prev) => ({
                ...prev,
                aiSummary: data.aiSummary || '',
                aiSummaryUpdatedAt: data.aiSummaryUpdatedAt || null,
            }));
            setExperiments((prev) =>
                prev.map((e) =>
                    e._id === viewingId
                        ? { ...e, aiSummary: data.aiSummary, aiSummaryUpdatedAt: data.aiSummaryUpdatedAt }
                        : e
                )
            );
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate AI summary.');
        } finally {
            setGeneratingAiSummaryId(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            setError('Title is required.');
            return;
        }
        try {
            setSubmitting(true);
            setError('');
            const conflictTags = form.conflictTagsInput
                ? form.conflictTagsInput.split(',').map((t) => t.trim()).filter(Boolean)
                : [];
            const logFieldDefinitions = form.logFieldDefinitions.map((f) => ({
                label: f.label.trim(),
                key: f.key.trim(),
                type: f.type,
                required: !!f.required,
                unit: f.unit?.trim() || undefined,
                options: f.optionsInput
                    ? f.optionsInput.split(',').map((o) => o.trim()).filter(Boolean)
                    : undefined,
            }));
            const payload = {
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                status: form.status,
                participantLimit: form.participantLimit,
                startDate: form.startDate || undefined,
                endDate: form.endDate || undefined,
                applicationDeadline: form.applicationDeadline || undefined,
                conflictTags,
                logFieldDefinitions,
            };
            if (editingId) {
                await api.put(`/experiments/${editingId}`, payload);
            } else {
                await api.post('/experiments', payload);
            }
            closeForm();
            fetchExperiments();
        } catch (err) {
            setError(err.response?.data?.message || (editingId ? 'Failed to update experiment.' : 'Failed to create experiment.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            setSubmitting(true);
            setError('');
            await api.delete(`/experiments/${id}`);
            setDeleteConfirmId(null);
            fetchExperiments();
            if (viewingId === id || editingId === id) closeForm();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete experiment.');
        } finally {
            setSubmitting(false);
        }
    };

    const isView = !!viewingId;
    const isEdit = !!editingId;

    if (!userId) return null;

    const statusBadgeClass = (status) => {
        const s = String(status || '').toLowerCase();
        if (s === 'published') return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';
        if (s === 'closed') return 'bg-rose-100 text-rose-800 ring-1 ring-rose-200';
        return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    };

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <section
                className="relative mb-8 overflow-hidden rounded-2xl border border-white/20 bg-slate-950 shadow-lg"
                aria-labelledby="researcher-experiments-heading"
            >
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${researcherHeroBg})` }}
                    aria-hidden
                />
                <div className="absolute inset-0 bg-slate-950/60" aria-hidden />
                <div className="relative z-10 flex min-h-[220px] max-w-2xl flex-col justify-center gap-2 px-6 py-10 sm:min-h-[260px] sm:px-10">
                    <h1
                        id="researcher-experiments-heading"
                        className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
                    >
                        My Experiments
                    </h1>
                    <p className="text-sm leading-relaxed text-slate-100/90 sm:text-base">
                        Create, edit, and manage your research experiments.
                    </p>
                    <div className="mt-4">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            onClick={openCreate}
                        >
                            + New Experiment
                        </button>
                    </div>
                </div>
            </section>

            {error && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="mt-4 space-y-3">
                        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
                        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                    </div>
                    <p className="mt-4 text-sm text-slate-500">Loading your experiments...</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {experiments.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-600">
                            You have no experiments yet. Create one to get started.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    <th className="whitespace-nowrap px-5 py-4">Title</th>
                                    <th className="whitespace-nowrap px-5 py-4">Status</th>
                                    <th className="whitespace-nowrap px-5 py-4">Participants</th>
                                    <th className="whitespace-nowrap px-5 py-4">Dates</th>
                                    <th className="whitespace-nowrap px-5 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {experiments.map((exp) => (
                                    <tr key={exp._id} className="border-t border-slate-100 hover:bg-slate-50/70">
                                        <td className="max-w-[22rem] px-5 py-4 font-medium text-slate-900">
                                            <div className="truncate" title={exp.title}>
                                                {exp.title}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadgeClass(
                                                    exp.status
                                                )}`}
                                            >
                                                {exp.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-700">
                                            {exp.currentParticipantCount ?? 0} /{' '}
                                            {exp.participantLimit === 0 ? '∞' : exp.participantLimit}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">
                                            {exp.startDate ? new Date(exp.startDate).toLocaleDateString() : '—'} –{' '}
                                            {exp.endDate ? new Date(exp.endDate).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                                                    onClick={() => openView(exp)}
                                                >
                                                    View
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                                    onClick={() => openEdit(exp)}
                                                >
                                                    Edit
                                                </button>
                                            {deleteConfirmId === exp._id ? (
                                                <>
                                                    <span className="text-xs font-medium text-slate-600">Delete?</span>
                                                    <button
                                                        type="button"
                                                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                                                        onClick={() => handleDelete(exp._id)}
                                                        disabled={submitting}
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-300"
                                                        onClick={() => setDeleteConfirmId(null)}
                                                    >
                                                        No
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                                    onClick={() => setDeleteConfirmId(exp._id)}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    )}
                </div>
            )}

            {formOpen && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={closeForm}
                >
                    <div
                        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h2 className="text-lg font-bold text-slate-900">
                                {isView ? 'View Experiment' : isEdit ? 'Edit Experiment' : 'Create Experiment'}
                            </h2>
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
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                        value={form.title}
                                        onChange={handleChange}
                                        required
                                        readOnly={isView}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-800">Description</label>
                                    <textarea
                                        name="description"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                        rows={3}
                                        value={form.description}
                                        onChange={handleChange}
                                        readOnly={isView}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-800">Status</label>
                                    <select
                                        name="status"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                        value={form.status}
                                        onChange={handleChange}
                                        disabled={isView}
                                    >
                                        {STATUS_OPTIONS.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-800">Participant limit (0 = unlimited)</label>
                                    <input
                                        name="participantLimit"
                                        type="number"
                                        min={0}
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                        value={form.participantLimit}
                                        onChange={handleChange}
                                        readOnly={isView}
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-semibold text-slate-800">Start date</label>
                                        <input
                                            name="startDate"
                                            type="date"
                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                            value={form.startDate}
                                            onChange={handleChange}
                                            readOnly={isView}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-slate-800">End date</label>
                                        <input
                                            name="endDate"
                                            type="date"
                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                            value={form.endDate}
                                            onChange={handleChange}
                                            readOnly={isView}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-800">Application deadline</label>
                                    <input
                                        name="applicationDeadline"
                                        type="date"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                        value={form.applicationDeadline}
                                        onChange={handleChange}
                                        readOnly={isView}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-800">Conflict tags (comma-separated)</label>
                                    <input
                                        name="conflictTagsInput"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                        placeholder="e.g. cardio, strength"
                                        value={form.conflictTagsInput}
                                        onChange={handleChange}
                                        readOnly={isView}
                                    />
                                </div>

                                {isView && (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <label className="text-sm font-semibold text-slate-800">AI Summary</label>
                                        {form.aiSummary ? (
                                            <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                                                {form.aiSummary}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm italic text-slate-600">
                                                No AI summary yet. Generate one from participant data.
                                            </p>
                                        )}
                                        {form.aiSummaryUpdatedAt && (
                                            <p className="mt-2 text-xs text-slate-500">
                                                Last updated: {new Date(form.aiSummaryUpdatedAt).toLocaleString()}
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                                            onClick={handleGenerateAiSummary}
                                            disabled={generatingAiSummaryId === viewingId}
                                        >
                                            {generatingAiSummaryId === viewingId ? 'Generating...' : 'Generate AI summary'}
                                        </button>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-semibold text-slate-800">Participant input fields</label>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Define the fields participants will fill in their daily logs (label, key, type, etc.).
                                    </p>
                                    <div className="mt-3 space-y-3">
                                        {form.logFieldDefinitions.map((field, index) => (
                                            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-700">Label</label>
                                                        <input
                                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                                            value={field.label}
                                                            onChange={(e) => handleLogFieldChange(index, 'label', e.target.value)}
                                                            readOnly={isView}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-700">Type</label>
                                                        <select
                                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                                            value={field.type}
                                                            onChange={(e) => handleLogFieldChange(index, 'type', e.target.value)}
                                                            disabled={isView}
                                                        >
                                                            <option value="number">number</option>
                                                            <option value="text">text</option>
                                                            <option value="boolean">boolean</option>
                                                            <option value="date">date</option>
                                                            <option value="time">time</option>
                                                            <option value="select">select</option>
                                                            <option value="multi-select">multi-select</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-700">Unit (optional)</label>
                                                        <input
                                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                                            value={field.unit}
                                                            onChange={(e) => handleLogFieldChange(index, 'unit', e.target.value)}
                                                            readOnly={isView}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-700">Options (for select, comma-separated)</label>
                                                        <input
                                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
                                                            value={field.optionsInput}
                                                            onChange={(e) => handleLogFieldChange(index, 'optionsInput', e.target.value)}
                                                            readOnly={isView}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex items-center justify-between gap-3">
                                                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                                            checked={field.required}
                                                            onChange={() => handleLogFieldToggleRequired(index)}
                                                            disabled={isView}
                                                        />
                                                        Required
                                                    </label>

                                                    {!isView && (
                                                        <button
                                                            type="button"
                                                            className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-300 disabled:opacity-60"
                                                            onClick={() => removeLogField(index)}
                                                            disabled={form.logFieldDefinitions.length === 1}
                                                        >
                                                            Remove field
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {!isView && (
                                        <button
                                            type="button"
                                            className="mt-3 rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-300"
                                            onClick={addLogField}
                                        >
                                            + Add field
                                        </button>
                                    )}
                                </div>

                                {!isView && (
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
                                            {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                                        </button>
                                    </div>
                                )}

                                {isView && (
                                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-300"
                                            onClick={() => {
                                                const exp = experiments.find((e) => e._id === viewingId);
                                                if (exp) {
                                                    setViewingId(null);
                                                    setEditingId(exp._id);
                                                    setForm({
                                                        title: exp.title || '',
                                                        description: exp.description || '',
                                                        status: exp.status || 'draft',
                                                        participantLimit: exp.participantLimit ?? 0,
                                                        startDate: exp.startDate ? exp.startDate.slice(0, 10) : '',
                                                        endDate: exp.endDate ? exp.endDate.slice(0, 10) : '',
                                                        applicationDeadline: exp.applicationDeadline ? exp.applicationDeadline.slice(0, 10) : '',
                                                        conflictTagsInput: Array.isArray(exp.conflictTags) ? exp.conflictTags.join(', ') : '',
                                                        aiSummary: exp.aiSummary || '',
                                                        aiSummaryUpdatedAt: exp.aiSummaryUpdatedAt || null,
                                                        logFieldDefinitions:
                                                            Array.isArray(exp.logFieldDefinitions) && exp.logFieldDefinitions.length > 0
                                                                ? exp.logFieldDefinitions.map((f) => ({
                                                                    label: f.label || '',
                                                                    key: f.key || '',
                                                                    type: f.type || 'text',
                                                                    required: !!f.required,
                                                                    unit: f.unit || '',
                                                                    optionsInput: Array.isArray(f.options) ? f.options.join(', ') : '',
                                                                }))
                                                                : [
                                                                    {
                                                                        label: '',
                                                                        key: '',
                                                                        type: 'text',
                                                                        required: false,
                                                                        unit: '',
                                                                        optionsInput: '',
                                                                    },
                                                                ],
                                                    });
                                                }
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                                            onClick={closeForm}
                                        >
                                            Close
                                        </button>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResearcherExperiments;
