import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ClipboardList, HeartPulse, Sparkles, Users } from 'lucide-react';
import api from '../api/api';

const formatJoinedDate = (date) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString();
};

const MyStudies = () => {
    const [studies, setStudies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMyStudies = async () => {
            if (!localStorage.getItem('token')) {
                setError('auth');
                setLoading(false);
                return;
            }

            try {
                const response = await api.get('/participations/my-studies');
                setStudies(response.data.studies);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching my studies:', err);
                if ([401, 403].includes(err.response?.status)) {
                    setError('auth');
                } else {
                    setError('We could not load your studies right now. Please try again later.');
                }
                setLoading(false);
            }
        };

        fetchMyStudies();
    }, []);

    const handleLeave = async (participationId) => {
        if (!window.confirm('Are you sure you want to leave this study? This will delete all your log data and you will be unenrolled.')) {
            return;
        }

        try {
            await api.put(`/participations/${participationId}/leave`);
            setStudies((prev) => prev.filter((p) => p._id !== participationId));
        } catch (err) {
            console.error('Leave study error:', err);
            alert(err.response?.data?.message || 'Failed to leave study.');
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="rounded-[2rem] border border-blue-200/70 bg-white/75 p-6 shadow-[0_20px_60px_rgba(37,99,235,0.10)] backdrop-blur-sm">
                    <div className="h-5 w-48 animate-pulse rounded bg-blue-100" />
                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-72 animate-pulse rounded-[1.75rem] bg-blue-50" />
                        ))}
                    </div>
                    <p className="mt-4 text-sm text-slate-500">Loading your enrolled studies...</p>
                </div>
            </div>
        );
    }

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
                                Participant Dashboard
                            </div>
                            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                                Sign in to view your studies
                            </h1>
                            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                                Your enrolled studies, progress, and daily logs are kept private. Log in to continue tracking your HealthLab participation.
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
                                    Explore Experiments
                                </Link>
                            </div>
                        </div>

                        <div className="relative border-t border-blue-100 bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-600 p-8 text-white lg:border-l lg:border-t-0 sm:p-10">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_34%)]" aria-hidden />
                            <div className="relative space-y-4">
                                {[
                                    { icon: ClipboardList, title: 'Study dashboards', text: 'Return to enrolled studies and continue your daily tracking.' },
                                    { icon: HeartPulse, title: 'Health progress', text: 'Review participation activity and keep your research logs organized.' },
                                    { icon: Users, title: 'Private access', text: 'Your study details are available only after signing in securely.' },
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
                                Participant Dashboard
                            </div>
                            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                                My Enrolled Studies
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-50/92 sm:text-base">
                                Track the health studies you are actively participating in, revisit progress, and jump back into your dashboards with ease.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[26rem]">
                            <div className="rounded-[1.7rem] border border-white/18 bg-white/12 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-blue-50">
                                    <ClipboardList className="h-4 w-4 text-blue-100" aria-hidden />
                                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em]">Studies</span>
                                </div>
                                <div className="mt-3 text-3xl font-bold text-white">{studies.length}</div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Active enrollments in your account</p>
                            </div>
                            <div className="rounded-[1.7rem] border border-white/18 bg-white/12 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-blue-50">
                                    <HeartPulse className="h-4 w-4 text-blue-100" aria-hidden />
                                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em]">Engagement</span>
                                </div>
                                <div className="mt-3 text-3xl font-bold text-white">
                                    {studies.filter((study) => String(study.status || '').toLowerCase() === 'joined').length}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Studies you are currently active in</p>
                            </div>
                            <div className="rounded-[1.7rem] border border-white/18 bg-white/12 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-blue-50">
                                    <Users className="h-4 w-4 text-blue-100" aria-hidden />
                                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em]">Access</span>
                                </div>
                                <div className="mt-3 text-3xl font-bold text-white">24/7</div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Open your study dashboard whenever you need</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    {studies.length === 0 ? (
                        <div className="rounded-[1.9rem] border border-blue-200/80 bg-white/80 p-10 text-center text-sm text-slate-600 shadow-[0_20px_60px_rgba(37,99,235,0.10)] backdrop-blur-sm">
                            <p>You haven&apos;t joined any studies yet.</p>
                            <a
                                href="/recommended"
                                className="mt-5 inline-flex items-center gap-2 rounded-[1.2rem] bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:bg-blue-500"
                            >
                                Browse Recommendations
                                <ArrowRight className="h-4 w-4" aria-hidden />
                            </a>
                        </div>
                    ) : (
                        <div className="rounded-[2.2rem] border border-blue-200/70 bg-white/72 p-4 shadow-[0_24px_70px_rgba(37,99,235,0.12)] backdrop-blur-sm sm:p-5 lg:p-6">
                            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                {studies.map((participation) => {
                                    const experiment = participation.experimentId;
                                    if (!experiment) return null;

                                    return (
                                        <article
                                            key={participation._id}
                                            className="group relative flex min-h-[23rem] flex-col overflow-hidden rounded-[1.85rem] border border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(239,246,255,0.92)_100%)] p-6 shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_22px_50px_rgba(37,99,235,0.12)]"
                                        >
                                            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/45 via-sky-100/25 to-transparent" aria-hidden />

                                            <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
                                                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.68rem] font-bold tracking-[0.22em] text-emerald-700 shadow-sm">
                                                    ENROLLED
                                                </div>
                                            </div>

                                            <h2 className="text-xl font-bold leading-tight text-slate-900">{experiment.title}</h2>
                                            <p className="mb-7 mt-3 grow text-sm leading-7 text-slate-600">
                                                {experiment.description}
                                            </p>

                                            <div className="mt-auto space-y-4">
                                                <div className="grid grid-cols-2 gap-3 rounded-[1.4rem] border border-blue-100 bg-white/80 p-3.5 text-sm shadow-sm">
                                                    <div>
                                                        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-blue-600">Status</div>
                                                        <div className="mt-1 text-base font-semibold capitalize text-slate-900">
                                                            {participation.status}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-blue-600">Joined</div>
                                                        <div className="mt-1 text-sm font-medium text-slate-600">
                                                            {formatJoinedDate(participation.dateJoined)}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3">
                                                    <button
                                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:bg-blue-500"
                                                        onClick={() => { window.location.href = `/dashboard/${participation._id}`; }}
                                                    >
                                                        View Dashboard
                                                        <ArrowRight className="h-4 w-4" aria-hidden />
                                                    </button>
                                                    <button
                                                        className="rounded-[1.2rem] border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                                                        onClick={() => handleLeave(participation._id)}
                                                    >
                                                        Leave
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default MyStudies;
