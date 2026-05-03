import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Sparkles, WalletCards } from 'lucide-react';
import { getMyContributions, devConfirmPayment } from '../api/funds';
import { getCurrentUser } from '../api/auth';

const MyContributions = () => {
    const navigate = useNavigate();
    const user = getCurrentUser();

    const [contributions, setContributions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');

        if (sessionId && params.get('payment') === 'success') {
            handleVerifyStripe(sessionId);
        } else {
            fetchContributions();
        }
    }, [window.location.search]);

    const handleVerifyStripe = async (sessionId) => {
        try {
            setLoading(true);
            await require('../api/funds').verifyStripePayment(sessionId);
            // Remove the query params after verification
            navigate('/my-contributions', { replace: true });
            fetchContributions();
        } catch (err) {
            console.error('Stripe verification failed:', err);
            fetchContributions();
        }
    };

    const fetchContributions = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await getMyContributions();
            const list = Array.isArray(data) ? data : [];
            setContributions(list);

            // Automatically try to verify any PENDING Stripe payments found in the list
            const pendingStripeSessions = list.filter(c => c.paymentStatus === 'PENDING' && c.paymentReferenceId?.startsWith('cs_'));
            
            if (pendingStripeSessions.length > 0) {
                const { verifyStripePayment } = await import('../api/funds');
                for (const session of pendingStripeSessions) {
                    try {
                        await verifyStripePayment(session.paymentReferenceId);
                    } catch (e) {
                        console.warn(`Could not auto-verify session ${session.paymentReferenceId}`);
                    }
                }
                // Refresh list after auto-verifying
                const refreshed = await getMyContributions();
                setContributions(Array.isArray(refreshed.data) ? refreshed.data : []);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load contributions.');
            setContributions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDevConfirm = async (referenceId) => {
        try {
            if (referenceId.startsWith('cs_')) {
                const { verifyStripePayment } = await import('../api/funds');
                await verifyStripePayment(referenceId);
            } else {
                await devConfirmPayment(referenceId);
            }
            fetchContributions();
        } catch (err) {
            console.error('Failed to confirm payment:', err);
            alert('Failed to confirm payment. Check console for details.');
        }
    };

    const totalContributed = contributions.reduce((sum, c) => sum + (c.paymentStatus === 'SUCCESS' ? c.amount : 0), 0);
    const totalPending = contributions.reduce((sum, c) => sum + (c.paymentStatus === 'PENDING' ? c.amount : 0), 0);
    const successCount = contributions.filter((c) => c.paymentStatus === 'SUCCESS').length;

    if (!user) return null;

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="rounded-[2rem] border border-blue-200/70 bg-white/75 p-6 shadow-[0_20px_60px_rgba(37,99,235,0.10)] backdrop-blur-sm">
                    <div className="h-5 w-48 animate-pulse rounded bg-blue-100" />
                    <div className="mt-6 grid gap-5 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-28 animate-pulse rounded-[1.75rem] bg-blue-50" />
                        ))}
                    </div>
                    <div className="mt-6 h-64 animate-pulse rounded-[2rem] bg-blue-50" />
                    <p className="mt-4 text-sm text-slate-500">Loading your contributions...</p>
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
                                My Contributions
                            </div>
                            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                                Track every contribution you have made to health research
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-50/92 sm:text-base">
                                Review successful payments, monitor pending support, and keep a clear record of the studies you have helped fund.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[26rem]">
                            <div className="rounded-[1.7rem] border border-white/18 bg-white/12 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-50">Total contributed</div>
                                <div className="mt-3 text-3xl font-bold text-white">LKR {totalContributed.toLocaleString()}</div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Confirmed support delivered to studies</p>
                            </div>
                            <div className="rounded-[1.7rem] border border-white/18 bg-white/12 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-50">Pending</div>
                                <div className="mt-3 text-3xl font-bold text-white">LKR {totalPending.toLocaleString()}</div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Payments still awaiting confirmation</p>
                            </div>
                            <div className="rounded-[1.7rem] border border-white/18 bg-white/12 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-50">Successful</div>
                                <div className="mt-3 text-3xl font-bold text-white">{successCount}</div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Completed contributions on record</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    {error && (
                        <div className="mb-6 rounded-[1.6rem] border border-rose-200 bg-white px-5 py-4 text-sm text-rose-700 shadow-sm">
                            {error}
                        </div>
                    )}

                    {contributions.length === 0 ? (
                        <div className="rounded-[2rem] border border-blue-200/70 bg-white/80 px-6 py-10 text-center shadow-[0_20px_60px_rgba(37,99,235,0.10)] backdrop-blur-sm">
                            <h2 className="text-xl font-semibold text-slate-900">No contributions yet</h2>
                            <p className="mt-3 text-sm leading-7 text-slate-600">
                                You have not made any contributions yet. Visit the Fund page to support research.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-[2rem] border border-blue-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(241,247,255,0.97))] shadow-[0_20px_60px_rgba(37,99,235,0.10)]">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200/80">
                                    <thead className="bg-blue-50/70">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-800">Experiment</th>
                                            <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-800">Amount</th>
                                            <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-800">Status</th>
                                            <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-800">Reference</th>
                                            <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-800">Date</th>
                                            <th className="px-6 py-4 text-left text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-800">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/70 bg-white/50">
                                        {contributions.map((c) => {
                                            const isSuccess = c.paymentStatus === 'SUCCESS';
                                            const isPending = c.paymentStatus === 'PENDING';

                                            return (
                                                <tr key={c._id} className="transition hover:bg-blue-50/40">
                                                    <td className="px-6 py-5 align-top">
                                                        <div className="font-semibold text-slate-900">
                                                            {c.fundRequestId?.experimentId?.title || c.experimentId?.title || 'Experiment'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 align-top text-sm font-semibold text-slate-900">
                                                        LKR {c.amount?.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-5 align-top">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <span
                                                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                                                    isSuccess
                                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                        : isPending
                                                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                                }`}
                                                            >
                                                                {isSuccess ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <Clock3 className="h-3.5 w-3.5" aria-hidden />}
                                                                {c.paymentStatus}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 align-top text-sm text-slate-500">
                                                        {c.paymentReferenceId || '-'}
                                                    </td>
                                                    <td className="px-6 py-5 align-top text-sm text-slate-600">
                                                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td className="max-w-[220px] px-6 py-5 align-top text-sm text-slate-600">
                                                        <div className="truncate">{c.notes || '-'}</div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default MyContributions;
