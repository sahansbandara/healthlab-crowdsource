import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ClipboardList, HeartPulse, Sparkles, Users } from 'lucide-react';
import api from '../api/api';
import SmartBadge from '../components/common/SmartBadge';

const RecommendationPage = () => {
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [joiningId, setJoiningId] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!localStorage.getItem('token')) {
                setError('auth');
                setLoading(false);
                return;
            }

            try {
                const response = await api.get('/recommendations');
                setExperiments(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching recommendations:', err);
                if ([401, 403].includes(err.response?.status)) {
                    setError('auth');
                } else {
                    setError('We could not load recommendations right now. Please try again later.');
                }
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, []);

    const handleJoin = async (experimentId) => {
        setJoiningId(experimentId);
        setMessage({ text: '', type: '' });

        try {
            const response = await api.post('/participations/join', { experimentId });
            setMessage({ text: 'Successfully Enrolled!', type: 'success' });

            // Update local state to show enrolled
            setExperiments(prev => prev.map(exp =>
                exp._id === experimentId ? { ...exp, enrolled: true } : exp
            ));
        } catch (err) {
            console.error('Join error:', err);
            const errorMsg = err.response?.data?.message || 'Failed to join experiment.';
            setMessage({ text: errorMsg, type: 'error' });
        } finally {
            setJoiningId(null);
        }
    };

    if (loading) return <div className="loading">Finding the best matches for you...</div>;
    if (error === 'auth') {
        return (
            <section className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#e6f2ff]">
                <motion.div
                    className="pointer-events-none absolute left-1/2 top-8 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-400/20 blur-3xl"
                    animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.85, 0.55] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden
                />
                <motion.div
                    className="pointer-events-none absolute right-6 top-28 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl"
                    animate={{ y: [0, 18, 0], opacity: [0.45, 0.75, 0.45] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden
                />
                <motion.div
                    className="pointer-events-none absolute bottom-10 left-8 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl"
                    animate={{ y: [0, -16, 0], scale: [1, 1.08, 1] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden
                />

                <div className="relative mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-blue-200/70 bg-white/82 shadow-[0_30px_90px_rgba(37,99,235,0.18)] backdrop-blur-sm lg:grid-cols-[1.05fr_0.95fr]"
                    >
                        <div className="p-8 sm:p-10 lg:p-12">
                            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-blue-700">
                                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                                Personalized Recommendations
                            </div>
                            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                                Sign in to view your recommended studies
                            </h1>
                            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                                HealthLab uses your profile and participation history to suggest experiments that match your interests. Log in to see your tailored research opportunities.
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:bg-blue-500"
                                >
                                    Sign In
                                    <ArrowRight className="h-4 w-4" aria-hidden />
                                </Link>
                                <Link
                                    to="/experiments"
                                    className="inline-flex items-center rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                                >
                                    Browse Experiments
                                </Link>
                            </div>
                        </div>

                        <div className="relative border-t border-blue-100 bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-600 p-8 text-white lg:border-l lg:border-t-0 sm:p-10">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_34%)]" aria-hidden />
                            <div className="relative space-y-4">
                                {[
                                    { icon: HeartPulse, title: 'Matched studies', text: 'Find health experiments that fit your interests and profile.' },
                                    { icon: ClipboardList, title: 'Clear eligibility', text: 'Review participation requirements before joining a study.' },
                                    { icon: Users, title: 'Research impact', text: 'Contribute data that supports real-world health discoveries.' },
                                ].map((item, index) => {
                                    const Icon = item.icon;
                                    return (
                                        <motion.div
                                            key={item.title}
                                            initial={{ opacity: 0, x: 18 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.18 + index * 0.1, duration: 0.45 }}
                                            className="rounded-2xl border border-white/18 bg-white/12 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-sm"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/18 text-white">
                                                    <Icon className="h-5 w-5" aria-hidden />
                                                </div>
                                                <div>
                                                    <h2 className="text-base font-bold">{item.title}</h2>
                                                    <p className="mt-1 text-sm leading-6 text-blue-50/90">{item.text}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        );
    }
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="experiment-list">
            <div className="recommendation-header">
                <h1>Recommended For You</h1>
                <p className="subtitle">Based on your health profile and interests</p>
                {message.text && (
                    <div className={`alert alert-${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>

            {experiments.length === 0 ? (
                <p>No recommendations found yet. Try updating your health profile!</p>
            ) : (
                <div className="experiments-grid">
                    {experiments.map((experiment) => (
                        <div key={experiment._id} className={`experiment-card ${experiment.featured ? 'featured' : ''}`}>
                            <SmartBadge score={experiment.matchScore} reason={experiment.matchReason} />
                            <h2>{experiment.title}</h2>
                            <p className="description">{experiment.description}</p>
                            <div className="experiment-details">
                                <span className="match-score">Match Score: {experiment.matchScore}%</span>
                                <span className="participants">
                                    Participants: {experiment.currentParticipantCount || 0} / {experiment.participantLimit || '∞'}
                                </span>
                            </div>

                            {experiment.enrolled ? (
                                <button className="join-btn enrolled" disabled>
                                    Enrolled
                                </button>
                            ) : (
                                <button
                                    className="join-btn"
                                    onClick={() => handleJoin(experiment._id)}
                                    disabled={joiningId === experiment._id}
                                >
                                    {joiningId === experiment._id ? 'Joining...' : 'Join Study'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecommendationPage;
