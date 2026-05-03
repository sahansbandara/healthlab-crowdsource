import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, ClipboardList, Clock3, HeartPulse, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api from '../api/api';

const StudyDashboardStyled = () => {
    const { participationId } = useParams();
    const [participation, setParticipation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formValues, setFormValues] = useState({});
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await api.get(`/participations/${participationId}`);
                setParticipation(response.data);

                const initialValues = {};
                const today = new Date().toISOString().split('T')[0];
                const todayLog = (response.data.logs || []).find((log) => log.date === today);

                response.data.experimentId.logFieldDefinitions.forEach((field) => {
                    if (todayLog && todayLog.data && todayLog.data[field.key] !== undefined) {
                        initialValues[field.key] = todayLog.data[field.key];
                    } else if (field.type === 'boolean') {
                        initialValues[field.key] = false;
                    } else {
                        initialValues[field.key] = '';
                    }
                });
                setFormValues(initialValues);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard. Please make sure you are logged in.');
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [participationId]);

    const handleInputChange = (key, value) => {
        setFormValues((prev) => ({ ...prev, [key]: value }));
    };

    const calculateProgress = () => {
        const start = new Date(participation.experimentId.publishedAt || participation.dateJoined);
        const end = participation.experimentId.endDate ? new Date(participation.experimentId.endDate) : null;
        const now = new Date();

        if (!end) return { percentage: 0, daysRemaining: null };

        const totalDuration = end - start;
        const elapsed = now - start;
        const remaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
        const percentage = Math.min(100, Math.max(0, Math.floor((elapsed / totalDuration) * 100)));

        return { percentage, daysRemaining: remaining };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ text: '', type: '' });

        try {
            const response = await api.post(`/participations/${participationId}/logs`, {
                logData: formValues,
            });
            setMessage({ text: response.data.message, type: 'success' });

            const today = new Date().toISOString().split('T')[0];
            setParticipation((prev) => {
                const logs = [...prev.logs];
                const existingIdx = logs.findIndex((l) => l.date === today);
                if (existingIdx !== -1) {
                    logs[existingIdx] = { ...logs[existingIdx], data: formValues, submittedAt: new Date() };
                } else {
                    logs.push({ date: today, data: formValues, submittedAt: new Date() });
                }
                return { ...prev, logs };
            });
        } catch (err) {
            console.error('Submit log error:', err);
            const errorMsg = err.response?.data?.message || 'Failed to submit log.';
            setMessage({ text: errorMsg, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteLog = async () => {
        if (!window.confirm("Are you sure you want to delete today's log entry? This cannot be undone.")) {
            return;
        }

        try {
            setSubmitting(true);
            const response = await api.delete(`/participations/${participationId}/logs/today`);
            setMessage({ text: response.data.message, type: 'success' });

            const emptyValues = {};
            participation.experimentId.logFieldDefinitions.forEach((field) => {
                if (field.type === 'boolean') emptyValues[field.key] = false;
                else emptyValues[field.key] = '';
            });
            setFormValues(emptyValues);

            setParticipation((prev) => ({
                ...prev,
                logs: response.data.logs,
            }));
        } catch (err) {
            console.error('Delete log error:', err);
            const errorMsg = err.response?.data?.message || 'Failed to delete log.';
            setMessage({ text: errorMsg, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="rounded-[2rem] border border-blue-200/70 bg-white/75 p-6 shadow-[0_20px_60px_rgba(37,99,235,0.10)] backdrop-blur-sm">
                    <div className="h-5 w-56 animate-pulse rounded bg-blue-100" />
                    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.35fr]">
                        <div className="h-64 animate-pulse rounded-[1.75rem] bg-blue-50" />
                        <div className="h-80 animate-pulse rounded-[1.75rem] bg-blue-50" />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-700 shadow-sm">
                    {error}
                </div>
            </div>
        );
    }

    const experiment = participation.experimentId;
    const today = new Date().toISOString().split('T')[0];
    const alreadyLoggedToday = participation.logs.some((log) => log.date === today);
    const progress = calculateProgress();

    return (
        <section className="relative overflow-hidden bg-transparent">
            <div
                className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[calc(100%-2rem)] max-w-[80rem] -translate-x-1/2 rounded-[3.25rem] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.20),transparent_38%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_30%)] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
                aria-hidden
            />
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <div className="overflow-hidden rounded-[3rem] border border-blue-200/70 bg-gradient-to-br from-[#173a74] via-[#29518f] to-[#3b6ab2] p-7 text-white shadow-[0_30px_80px_rgba(37,99,235,0.18)] sm:p-9 lg:p-10">
                    <a
                        href="/my-studies"
                        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-50 shadow-sm backdrop-blur-sm"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                        Back to My Studies
                    </a>

                    <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-50 shadow-sm backdrop-blur-sm">
                                <HeartPulse className="h-3.5 w-3.5" aria-hidden />
                                Participant Command Center
                            </div>
                            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                                {experiment.title}
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-50/92 sm:text-base">
                                Log your daily progress, review your study timeline, and stay on top of participation requirements from one place.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[26rem]">
                            <div className="rounded-[1.7rem] border border-white/18 bg-white/12 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-blue-50">
                                    <CalendarDays className="h-4 w-4 text-blue-100" aria-hidden />
                                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em]">Joined</span>
                                </div>
                                <div className="mt-3 text-xl font-bold text-white">{new Date(participation.dateJoined).toLocaleDateString()}</div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Enrollment start date</p>
                            </div>
                            <div className="rounded-[1.7rem] border border-white/18 bg-white/12 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-blue-50">
                                    <ClipboardList className="h-4 w-4 text-blue-100" aria-hidden />
                                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em]">Logs</span>
                                </div>
                                <div className="mt-3 text-3xl font-bold text-white">{participation.logs.length}</div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Entries submitted so far</p>
                            </div>
                            <div className="rounded-[1.7rem] border border-white/18 bg-white/12 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-blue-50">
                                    <ShieldCheck className="h-4 w-4 text-blue-100" aria-hidden />
                                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em]">Progress</span>
                                </div>
                                <div className="mt-3 text-3xl font-bold text-white">{progress.percentage}%</div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">
                                    {progress.daysRemaining !== null ? `${progress.daysRemaining} days remaining` : 'No end date set'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.35fr]">
                    <div className="rounded-[2rem] border border-blue-200/70 bg-white/78 p-6 shadow-[0_24px_70px_rgba(37,99,235,0.12)] backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-slate-900">Study Overview</h2>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{experiment.description}</p>

                        <div className="mt-6 rounded-[1.6rem] border border-blue-100 bg-blue-50/75 p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between gap-4 text-sm font-semibold text-slate-700">
                                <span>Study Progress</span>
                                {progress.daysRemaining !== null && (
                                    <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                                        {progress.daysRemaining} days left
                                    </span>
                                )}
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-blue-100">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400 transition-[width] duration-500"
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </div>
                            <div className="mt-3 flex flex-wrap justify-between gap-3 text-xs text-slate-500">
                                <span>Published: {new Date(experiment.publishedAt || participation.dateJoined).toLocaleDateString()}</span>
                                {experiment.endDate && <span>Ends: {new Date(experiment.endDate).toLocaleDateString()}</span>}
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 rounded-[1.6rem] border border-blue-100 bg-white/80 p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="font-semibold text-blue-600">Joined</span>
                                <span className="font-medium text-slate-700">{new Date(participation.dateJoined).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-sm">
                                <span className="font-semibold text-blue-600">Logs Submitted</span>
                                <span className="font-medium text-slate-700">{participation.logs.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-blue-200/70 bg-white/78 p-6 shadow-[0_24px_70px_rgba(37,99,235,0.12)] backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-slate-900">
                            {alreadyLoggedToday ? "Update Today's Log" : 'Daily Progress Log'}
                        </h2>
                        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                            <Clock3 className="h-3.5 w-3.5" aria-hidden />
                            {new Date().toLocaleDateString()}
                        </p>

                        {message.text && (
                            <div
                                className={`mt-5 rounded-[1.4rem] border px-4 py-3 text-sm shadow-sm ${
                                    message.type === 'success'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                        : 'border-rose-200 bg-rose-50 text-rose-700'
                                }`}
                            >
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                            {experiment.logFieldDefinitions.map((field) => (
                                <div key={field.key} className="rounded-[1.5rem] border border-blue-100 bg-white/80 p-4 shadow-sm">
                                    <label htmlFor={field.key} className="block text-sm font-semibold text-slate-800">
                                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                                        {field.unit && <span className="ml-2 text-xs font-medium text-slate-500">({field.unit})</span>}
                                    </label>

                                    {field.type === 'number' && (
                                        <input
                                            id={field.key}
                                            type="number"
                                            value={formValues[field.key]}
                                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                                            required={field.required}
                                            min={field.min}
                                            max={field.max}
                                            placeholder={field.helpText}
                                            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    )}

                                    {field.type === 'text' && (
                                        <textarea
                                            id={field.key}
                                            value={formValues[field.key]}
                                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                                            required={field.required}
                                            placeholder={field.helpText}
                                            className="mt-3 min-h-[110px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    )}

                                    {field.type === 'boolean' && (
                                        <label className="mt-3 inline-flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
                                            <input
                                                id={field.key}
                                                type="checkbox"
                                                checked={formValues[field.key]}
                                                onChange={(e) => handleInputChange(field.key, e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                            />
                                            <span>{field.helpText || 'Yes / No'}</span>
                                        </label>
                                    )}

                                    {field.type === 'select' && (
                                        <select
                                            id={field.key}
                                            value={formValues[field.key]}
                                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                                            required={field.required}
                                            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="">Select an option</option>
                                            {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    )}
                                </div>
                            ))}

                            <button
                                type="submit"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 disabled:opacity-60"
                                disabled={submitting}
                            >
                                {submitting ? 'Submitting...' : alreadyLoggedToday ? 'Update Log' : 'Submit Daily Log'}
                            </button>
                        </form>

                        {alreadyLoggedToday && (
                            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                                <p className="text-sm text-slate-600">You can update your log until midnight today.</p>
                                <button
                                    type="button"
                                    className="rounded-[1.1rem] border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                                    onClick={handleDeleteLog}
                                    disabled={submitting}
                                >
                                    {submitting ? '...' : "Delete Today's Entry"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 rounded-[2rem] border border-blue-200/70 bg-white/78 p-6 shadow-[0_24px_70px_rgba(37,99,235,0.12)] backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-slate-900">Log History</h2>
                    {participation.logs.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-600">No logs submitted yet.</p>
                    ) : (
                        <div className="mt-5 overflow-x-auto rounded-[1.5rem] border border-blue-100 bg-white/80 shadow-sm">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                                        <th className="whitespace-nowrap px-5 py-4">Date</th>
                                        {experiment.logFieldDefinitions.map((f) => <th key={f.key} className="whitespace-nowrap px-5 py-4">{f.label}</th>)}
                                        <th className="whitespace-nowrap px-5 py-4">Submitted At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...participation.logs].sort((a, b) => b.date.localeCompare(a.date)).map((log, idx) => (
                                        <tr key={idx} className="border-t border-blue-100/80 transition hover:bg-blue-50/40">
                                            <td className="px-5 py-4 font-medium text-slate-900">{new Date(log.date).toLocaleDateString()}</td>
                                            {experiment.logFieldDefinitions.map((f) => (
                                                <td key={f.key} className="px-5 py-4 text-slate-600">
                                                    {log.data[f.key] === true ? 'Yes' : log.data[f.key] === false ? 'No' : log.data[f.key]}
                                                </td>
                                            ))}
                                            <td className="px-5 py-4 text-slate-500">{new Date(log.submittedAt).toLocaleTimeString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default StudyDashboardStyled;
