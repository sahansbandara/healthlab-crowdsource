import React, { useEffect, useState } from 'react';
import api from '../api/api';
import SmartBadge from './common/SmartBadge';

const ExperimentList = () => {
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [joiningId, setJoiningId] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '', reason: '', explanation: '' });
    const [analysis, setAnalysis] = useState(null); // { text: string }
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
                source: response.data.source
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
                let response;

                if (token) {
                    // Fetch recommendations (which are experiments + match score)
                    response = await api.get('/recommendations');
                } else {
                    response = await api.get('/experiments');
                }

                setExperiments(response.data);
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
                explanation: data.explanation || ''
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
            setMessage({ text: 'Successfully Enrolled!', type: 'success', reason: '', explanation: '' });

            // Update local state
            setExperiments(prev => prev.map(exp =>
                exp._id === experimentId ? { ...exp, enrolled: true, currentParticipantCount: (exp.currentParticipantCount || 0) + 1 } : exp
            ));
        } catch (err) {
            console.error('Join error:', err);
            const data = err.response?.data || {};
            const errorMsg = data.message || 'Failed to join experiment.';
            setMessage({
                text: errorMsg,
                type: 'error',
                reason: data.reason || '',
                explanation: data.explanation || ''
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
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />
                        ))}
                    </div>
                    <p className="mt-4 text-sm text-slate-500">Loading experiments...</p>
                </div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                    Available Experiments
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                    Explore experiments across disciplines and join a study when you’re ready.
                </p>
            </div>
            {message.text && (
                <div
                    className={`mb-6 rounded-2xl border px-5 py-4 text-left shadow-sm ${
                        message.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-rose-200 bg-rose-50 text-rose-900'
                    }`}
                >
                    <div className={`text-sm font-bold ${message.explanation ? 'mb-2' : ''}`}>{message.text}</div>
                    {message.reason && (
                        <div className="mb-2 text-sm">
                            <span className="font-semibold">Justification:</span> {message.reason}
                        </div>
                    )}
                    {message.explanation && (
                        <div className="mt-2 border-t border-black/10 pt-2 text-sm text-slate-700">
                            {message.explanation}
                        </div>
                    )}
                </div>
            )}
            <div className="w-full">
            {experiments.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
                    No experiments available at the moment.
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {experiments.map((experiment) => (
                        <div
                            key={experiment._id}
                            className={`group relative flex flex-col p-6 rounded-2xl bg-white shadow-card transition-all duration-200 ${experiment.matchScore >= 80 ? 'shadow-[0_10px_25px_-5px_rgba(21,128,61,0.15),0_4px_10px_-3px_rgba(21,128,61,0.1)] -translate-y-0.5' : 'border border-slate-200 hover:-translate-y-0.5 hover:shadow-cardHover'}`}
                        >
                            {experiment.matchScore >= 80 && (
                                <>
                                    <div className="absolute inset-[-2px] bg-gradient-to-br from-green-700 to-green-500 rounded-2xl -z-10" />
                                    <div className="absolute -top-3 right-5 bg-gradient-to-r from-green-700 to-green-500 text-white text-[0.7rem] font-extrabold py-1 px-3 rounded-xl tracking-wider shadow-[0_4px_6px_rgba(21,128,61,0.3)] z-10">
                                        ✓ TOP AI MATCH
                                    </div>
                                </>
                            )}
                            <div className="mb-3 flex justify-between items-start">
                                <SmartBadge score={experiment.matchScore} reason={experiment.matchReason} />
                                <div
                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${
                                        experiment.status === 'active'
                                            ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
                                            : experiment.status === 'draft'
                                              ? 'bg-amber-100 text-amber-800 ring-amber-200'
                                              : 'bg-rose-100 text-rose-800 ring-rose-200'
                                    }`}
                                >
                                    {experiment.status}
                                </div>
                            </div>

                            <h2 className="text-lg font-bold leading-snug text-slate-900">{experiment.title}</h2>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600 mb-6 grow">
                                {experiment.description}
                            </p>

                            <div className="mt-auto border-t border-slate-100 pt-4 text-sm text-slate-600 flex justify-between items-center">
                                <div>
                                    <span className="font-medium text-slate-800">Participants:</span>{' '}
                                    {experiment.currentParticipantCount || 0} /{' '}
                                    {experiment.participantLimit === 0 ? 'Unlimited' : experiment.participantLimit}
                                </div>
                            </div>

                            {!localStorage.getItem('token') ? (
                                <button
                                    className="mt-4 w-full rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-300"
                                    onClick={() => window.location.href = '/login'}
                                >
                                    Login to Join
                                </button>
                            ) : experiment.enrolled ? (
                                <button
                                    className="mt-4 w-full cursor-not-allowed rounded-xl bg-emerald-100 px-4 py-2.5 text-sm font-semibold text-emerald-800"
                                    disabled
                                >
                                    Enrolled
                                </button>
                            ) : (
                                <button
                                    className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                                    onClick={() => handlePreviewJoin(experiment._id)}
                                    disabled={previewingId === experiment._id || joiningId === experiment._id}
                                >
                                    {previewingId === experiment._id ? 'Analyzing...' : 'Join Study'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}</div>

            {/* CLINICAL INSIGHT MODAL */}
            {showModal && analysis && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl relative">
                        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 bg-blue-50/50">
                            <div className="text-2xl pt-1" aria-hidden>🧠</div>
                            <h2 className="text-lg font-extrabold text-blue-700 sm:text-xl m-0">Personalized Clinical Insight</h2>
                        </div>

                        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
                            <p className="mb-6 text-sm leading-relaxed text-slate-700 sm:text-base">
                                <span className="italic">"{analysis.text}"</span>
                            </p>

                            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                <span className="font-semibold">Note:</span> This analysis is generated based on your medical profile (Weight, BMI, and Diseases) using our Clinical NLP engine.
                            </div>

                        {/* WGER SAFETY INTEGRATION (Year 3 System Integrity Feature) */}
                        <div className="mb-6">
                            {!safetyGuidelines ? (
                                <button
                                    className="inline-flex items-center gap-2 rounded-xl border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                                    onClick={() => handleFetchSafety(analysis.experimentId)}
                                    disabled={loadingSafety}
                                >
                                    {loadingSafety ? 'Fetching Clinical Guidelines...' : '🛡️ View Activity Safety Guidelines'}
                                </button>
                            ) : (
                                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-sm">
                                    <h4 className="mb-2 flex items-center gap-2 font-bold text-blue-900">
                                        <span aria-hidden>📋</span> Activity Protocol
                                    </h4>
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
                                                    {expandedIndex === idx ? '▲ Collapse' : '▼ View Advanced Protocol'}
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
                                                <span className="font-semibold">⚠️ Safety:</span> {g.safetyWarning}
                                            </div>

                                            {/* Advanced Protocol Drill-Down */}
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
                                    <div className="mt-2 text-right text-xs text-slate-500">
                                        Source: {safetyGuidelines.source}
                                    </div>
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
        </div>
    );
};

export default ExperimentList;
