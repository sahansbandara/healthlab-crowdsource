import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, FlaskConical, ShieldCheck, Sparkles, Users } from 'lucide-react';
import api from '../api/api';
import SmartBadge from './common/SmartBadge';

const formatExperimentMeta = (experiment) => {
    const tags = Array.isArray(experiment.tags) ? experiment.tags.filter(Boolean) : [];
    const label = tags[0] || experiment.status || 'Open study';
    const fieldCount = Array.isArray(experiment.logFieldDefinitions) ? experiment.logFieldDefinitions.length : 0;
    const participantCount = experiment.currentParticipantCount || 0;
    const participantLimit = experiment.participantLimit === 0 ? 'Unlimited' : experiment.participantLimit;

    return {
        label: String(label).replace(/[-_]/g, ' '),
        participantCount,
        participantLimit,
        summary:
            fieldCount > 0
                ? `${fieldCount} tracking field${fieldCount === 1 ? '' : 's'} configured`
                : 'Structured participation workflow ready',
    };
};

const ExperimentShowcase = () => {
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [joiningId, setJoiningId] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '', reason: '', explanation: '' });
    const [analysis, setAnalysis] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [previewingId, setPreviewingId] = useState(null);
    const [safetyGuidelines, setSafetyGuidelines] = useState(null);
    const [loadingSafety, setLoadingSafety] = useState(false);
    const [expandedIndex, setExpandedIndex] = useState(null);

    const handleFetchSafety = async (experimentId) => {
        setLoadingSafety(true);
        try {
            const response = await api.get(`/experiments/${experimentId}/safety-guidelines`);
            setSafetyGuidelines({
                guidelines: response.data.guidelines,
                source: response.data.source,
            });
        } catch (err) {
            console.error('Safety guidelines fetch error:', err);
        } finally {
            setLoadingSafety(false);
        }
    };

    useEffect(() => {
        const fetchExperiments = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = token ? await api.get('/recommendations') : await api.get('/experiments');
                const publishedExperiments = response.data.filter((exp) => exp.status !== 'draft');
                setExperiments(publishedExperiments);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching experiments:', err);
                setError('Failed to load experiments. Please try again later.');
                setLoading(false);
            }
        };

        fetchExperiments();
    }, []);

    const handlePreviewJoin = async (experimentId) => {
        setPreviewingId(experimentId);
        setMessage({ text: '', type: '', reason: '', explanation: '' });
        setSafetyGuidelines(null);
        setExpandedIndex(null);

        try {
            const response = await api.get(`/participations/preview-analysis/${experimentId}`);
            setAnalysis({ text: response.data.analysis, experimentId });
            setShowModal(true);
        } catch (err) {
            console.error('Preview error:', err);
            const data = err.response?.data || {};
            setMessage({
                text: data.message || 'Failed to generate clinical analysis.',
                type: 'error',
                reason: data.reason || '',
                explanation: data.explanation || '',
            });
        } finally {
            setPreviewingId(null);
        }
    };

    const handleJoin = async (experimentId) => {
        setJoiningId(experimentId);
        setMessage({ text: '', type: '' });

        try {
            await api.post('/participations/join', { experimentId });
            setMessage({ text: 'Successfully enrolled.', type: 'success', reason: '', explanation: '' });
            setExperiments((prev) =>
                prev.map((exp) =>
                    exp._id === experimentId
                        ? { ...exp, enrolled: true, currentParticipantCount: (exp.currentParticipantCount || 0) + 1 }
                        : exp
                )
            );
        } catch (err) {
            console.error('Join error:', err);
            const data = err.response?.data || {};
            setMessage({
                text: data.message || 'Failed to join experiment.',
                type: 'error',
                reason: data.reason || '',
                explanation: data.explanation || '',
            });
        } finally {
            setJoiningId(null);
            setShowModal(false);
            setAnalysis(null);
            setSafetyGuidelines(null);
            setExpandedIndex(null);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="rounded-[2rem] border border-blue-200/70 bg-white/75 p-6 shadow-[0_20px_60px_rgba(37,99,235,0.10)] backdrop-blur-sm">
                    <div className="h-5 w-48 animate-pulse rounded bg-blue-100" />
                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-64 animate-pulse rounded-[1.75rem] bg-blue-50" />
                        ))}
                    </div>
                    <p className="mt-4 text-sm text-slate-500">Loading experiments...</p>
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

    return (
        <section className="relative overflow-hidden bg-transparent">
            <div
                className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[calc(100%-2rem)] max-w-[80rem] -translate-x-1/2 rounded-[3.25rem] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.20),transparent_38%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_30%)] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
                aria-hidden
            />
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <div className="overflow-hidden rounded-[3rem] border border-blue-200/70 bg-gradient-to-br from-[#173a74] via-[#29518f] to-[#3b6ab2] p-7 text-white shadow-[0_30px_80px_rgba(37,99,235,0.18)] sm:p-9 lg:p-10">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-50 shadow-sm backdrop-blur-sm">
                                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                                Experiment Directory
                            </div>
                            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                                Discover active health studies
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-50/92 sm:text-base">
                                Browse open experiments, review participant demand, and find studies that fit your interests and eligibility with confidence.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[26rem]">
                            <div className="rounded-[1.7rem] border border-white/18 bg-white/12 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-blue-50">
                                    <FlaskConical className="h-4 w-4 text-blue-100" aria-hidden />
                                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em]">Studies</span>
                                </div>
                                <div className="mt-3 text-3xl font-bold text-white">{experiments.length}</div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Published opportunities ready to explore</p>
                            </div>
                            <div className="rounded-[1.7rem] border border-white/18 bg-white/12 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-blue-50">
                                    <Users className="h-4 w-4 text-blue-100" aria-hidden />
                                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em]">Recruitment</span>
                                </div>
                                <div className="mt-3 text-3xl font-bold text-white">
                                    {experiments.filter((exp) => !exp.enrolled).length}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Studies currently open for new participants</p>
                            </div>
                            <div className="rounded-[1.7rem] border border-white/18 bg-white/12 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-blue-50">
                                    <ShieldCheck className="h-4 w-4 text-blue-100" aria-hidden />
                                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em]">Insights</span>
                                </div>
                                <div className="mt-3 text-3xl font-bold text-white">AI</div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Personalized preview and safety guidance available</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 w-full">
                    {message.text && (
                        <div
                            className={`mb-6 rounded-[1.6rem] border px-5 py-4 text-left shadow-sm ${
                                message.type === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                    : 'border-rose-200 bg-white text-rose-700'
                            }`}
                        >
                            <div className={`text-sm font-bold ${message.explanation ? 'mb-2' : ''}`}>{message.text}</div>
                            {message.reason && (
                                <div className="mb-2 text-sm">
                                    <span className="font-semibold">Justification:</span> {message.reason}
                                </div>
                            )}
                            {message.explanation && (
                                <div className="mt-2 border-t border-slate-200 pt-2 text-sm text-slate-600">
                                    {message.explanation}
                                </div>
                            )}
                        </div>
                    )}

                    {experiments.length === 0 ? (
                        <div className="rounded-[1.9rem] border border-blue-200/80 bg-white/80 p-10 text-center text-sm text-slate-600 shadow-[0_20px_60px_rgba(37,99,235,0.10)] backdrop-blur-sm">
                            No experiments available at the moment.
                        </div>
                    ) : (
                        <div className="rounded-[2.2rem] border border-blue-200/70 bg-white/72 p-4 shadow-[0_24px_70px_rgba(37,99,235,0.12)] backdrop-blur-sm sm:p-5 lg:p-6">
                            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                {experiments.map((experiment) => {
                                    const meta = formatExperimentMeta(experiment);

                                    return (
                                        <article
                                            key={experiment._id}
                                            className={`group relative flex min-h-[23rem] flex-col overflow-hidden rounded-[1.85rem] border p-6 transition-all duration-300 ${
                                                experiment.matchScore >= 80
                                                    ? 'border-blue-300/80 bg-gradient-to-br from-white via-blue-50 to-sky-50 shadow-[0_18px_50px_rgba(37,99,235,0.16)]'
                                                    : 'border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(239,246,255,0.92)_100%)] shadow-[0_14px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_22px_50px_rgba(37,99,235,0.12)]'
                                            }`}
                                        >
                                            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/45 via-sky-100/25 to-transparent" aria-hidden />
                                            {experiment.matchScore >= 80 && (
                                                <div className="absolute right-5 top-5 rounded-full border border-blue-200 bg-blue-600 px-3 py-1 text-[0.68rem] font-bold tracking-[0.22em] text-white shadow-sm">
                                                    TOP MATCH
                                                </div>
                                            )}

                                            <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-100/80 text-blue-700 shadow-sm">
                                                    <Activity className="h-5 w-5" aria-hidden />
                                                </div>
                                                <div className="rounded-full border border-blue-200 bg-white/90 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-blue-700 shadow-sm">
                                                    {meta.label}
                                                </div>
                                            </div>

                                            <div className="mb-3 flex justify-between items-start">
                                                <SmartBadge score={experiment.matchScore} reason={experiment.matchReason} />
                                            </div>

                                            <h2 className="text-xl font-bold leading-tight text-slate-900">{experiment.title}</h2>
                                            <p className="mb-7 mt-3 grow text-sm leading-7 text-slate-600">
                                                {experiment.description}
                                            </p>

                                            <div className="mt-auto space-y-4">
                                                <div className="grid grid-cols-2 gap-3 rounded-[1.4rem] border border-blue-100 bg-white/80 p-3.5 text-sm shadow-sm">
                                                    <div>
                                                        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-blue-600">Participants</div>
                                                        <div className="mt-1 text-base font-semibold text-slate-900">
                                                            {meta.participantCount} / {meta.participantLimit}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-blue-600">Setup</div>
                                                        <div className="mt-1 text-sm font-medium text-slate-600">
                                                            {meta.summary}
                                                        </div>
                                                    </div>
                                                </div>

                                                {!localStorage.getItem('token') ? (
                                                    <button
                                                        className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
                                                        onClick={() => { window.location.href = '/login'; }}
                                                    >
                                                        Login to Join
                                                        <ArrowRight className="h-4 w-4" aria-hidden />
                                                    </button>
                                                ) : experiment.enrolled ? (
                                                    <button
                                                        className="w-full cursor-not-allowed rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
                                                        disabled
                                                    >
                                                        Enrolled
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 disabled:opacity-60"
                                                        onClick={() => handlePreviewJoin(experiment._id)}
                                                        disabled={previewingId === experiment._id || joiningId === experiment._id}
                                                    >
                                                        {previewingId === experiment._id ? 'Analyzing...' : 'Join Study'}
                                                        <ArrowRight className="h-4 w-4" aria-hidden />
                                                    </button>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showModal && analysis && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-blue-50/50 px-6 py-4">
                            <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">Insight</div>
                            <h2 className="m-0 text-lg font-extrabold text-blue-700 sm:text-xl">Personalized Clinical Insight</h2>
                        </div>

                        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
                            <p className="mb-6 text-sm leading-relaxed text-slate-700 sm:text-base">
                                <span className="italic">"{analysis.text}"</span>
                            </p>

                            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                <span className="font-semibold">Note:</span> This analysis is generated based on your medical profile (Weight, BMI, and Diseases) using our Clinical NLP engine.
                            </div>

                            <div className="mb-6">
                                {!safetyGuidelines ? (
                                    <button
                                        className="inline-flex items-center gap-2 rounded-xl border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                                        onClick={() => handleFetchSafety(analysis.experimentId)}
                                        disabled={loadingSafety}
                                    >
                                        {loadingSafety ? 'Fetching clinical guidelines...' : 'View activity safety guidelines'}
                                    </button>
                                ) : (
                                    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-sm">
                                        <h4 className="mb-2 font-bold text-blue-900">Activity Protocol</h4>
                                        {safetyGuidelines.guidelines.map((g, idx) => (
                                            <div
                                                key={idx}
                                                className={`mb-3 rounded-xl p-3 ${expandedIndex === idx ? 'border border-slate-200 bg-white' : 'bg-transparent'}`}
                                            >
                                                <div
                                                    className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-slate-900"
                                                    onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                                                >
                                                    <span>{g.name}</span>
                                                    <span className="text-xs font-semibold text-blue-700">
                                                        {expandedIndex === idx ? 'Collapse' : 'View advanced protocol'}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                                                    <span>
                                                        <span className="font-semibold">Target:</span> {g.muscleGroup}
                                                    </span>
                                                    <span>
                                                        <span className="font-semibold">Intensity:</span> {g.intensity}
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-xs text-amber-800">
                                                    <span className="font-semibold">Safety:</span> {g.safetyWarning}
                                                </div>

                                                {expandedIndex === idx && g.advancedProtocol && (
                                                    <div className="mt-3 border-t border-dashed border-slate-200 pt-3 text-xs text-slate-700">
                                                        <p className="mb-2">
                                                            <span className="font-semibold">Engaged Muscles:</span>{' '}
                                                            {g.advancedProtocol.muscles.join(', ') || 'N/A'}
                                                        </p>
                                                        <p className="mb-2">
                                                            <span className="font-semibold">Equipment:</span>{' '}
                                                            {g.advancedProtocol.equipment.join(', ')}
                                                        </p>
                                                        <p className="italic text-slate-600">
                                                            <span className="not-italic font-semibold text-slate-700">Instructions:</span>{' '}
                                                            {g.advancedProtocol.description}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <div className="mt-2 text-right text-xs text-slate-500">Source: {safetyGuidelines.source}</div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap justify-end gap-3">
                                <button
                                    className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-300"
                                    onClick={() => {
                                        setShowModal(false);
                                        setSafetyGuidelines(null);
                                        setExpandedIndex(null);
                                    }}
                                >
                                    Back
                                </button>
                                <button
                                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                                    onClick={() => handleJoin(analysis.experimentId)}
                                    disabled={joiningId === analysis.experimentId}
                                >
                                    {joiningId === analysis.experimentId ? 'Enrolling...' : 'Confirm Enrollment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ExperimentShowcase;
