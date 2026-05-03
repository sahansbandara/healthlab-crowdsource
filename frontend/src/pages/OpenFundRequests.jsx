import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, HandCoins, Sparkles, Wallet, WalletCards } from 'lucide-react';
import { getOpenFundRequests, createPayment } from '../api/funds';
import { getCurrentUser } from '../api/auth';

const OpenFundRequests = () => {
    const user = getCurrentUser();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedReq, setSelectedReq] = useState(null);
    const [contributeAmount, setContributeAmount] = useState('');
    const [contributeNotes, setContributeNotes] = useState('');
    const [contributing, setContributing] = useState(false);

    useEffect(() => {
        fetchOpenFundRequests();
    }, []);

    const fetchOpenFundRequests = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await getOpenFundRequests();
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load fund requests.');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const getFundingPercentage = (raised, target) => {
        if (!target || target <= 0) return 0;
        return Math.min(100, Math.round((raised / target) * 100));
    };

    const openContributeModal = (request) => {
        if (!user) {
            window.location.href = '/login';
            return;
        }

        setSelectedReq(request);
        setContributeAmount('');
        setContributeNotes('');
        setError('');
        setSuccess('');
    };

    const closeContributeModal = () => {
        setSelectedReq(null);
        setContributeAmount('');
        setContributeNotes('');
    };

    const handleContribute = async (e) => {
        e.preventDefault();

        if (!selectedReq?._id) {
            setError('Invalid fund request selected.');
            return;
        }

        const amount = Number(contributeAmount);
        if (!amount || amount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        const target = Number(selectedReq.targetAmount || 0);
        const raised = Number(selectedReq.raisedAmount || 0);
        const remaining = Math.max(0, target - raised);

        if (amount > remaining) {
            setError(`Amount exceeds remaining target. Maximum: LKR ${remaining.toLocaleString()}`);
            return;
        }

        try {
            setContributing(true);
            setError('');
            setSuccess('');

            const { data } = await createPayment({
                fundRequestId: selectedReq._id,
                amount,
                notes: contributeNotes.trim(),
            });

            if (data?.checkout?.url) {
                window.location.href = data.checkout.url;
                return;
            }

            setSuccess('Contribution created successfully.');
            closeContributeModal();
            fetchOpenFundRequests();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create payment.');
        } finally {
            setContributing(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="rounded-[2rem] border border-blue-200/70 bg-white/75 p-6 shadow-[0_20px_60px_rgba(37,99,235,0.10)] backdrop-blur-sm">
                    <div className="h-5 w-48 animate-pulse rounded bg-blue-100" />
                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-72 animate-pulse rounded-[1.75rem] bg-blue-50" />
                        ))}
                    </div>
                    <p className="mt-4 text-sm text-slate-500">Loading fund requests...</p>
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
                <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-blue-200/70 bg-gradient-to-br from-[#173a74] via-[#29518f] to-[#3b6ab2] p-5 text-white shadow-[0_30px_80px_rgba(37,99,235,0.18)] sm:p-6 lg:p-7">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-50 shadow-sm backdrop-blur-sm">
                                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                                Research Funding
                            </div>
                            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-[2.55rem] lg:leading-[1.04]">
                                Support health research with direct contributions
                            </h1>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50/92">
                                Help promising studies move forward by funding active requests, tracking progress clearly, and contributing where your support can make a real difference.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-3">
                                {user && (
                                    <Link
                                        to="/my-contributions"
                                        className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/18"
                                    >
                                        <WalletCards className="h-4 w-4" aria-hidden />
                                        My Contributions
                                    </Link>
                                )}
                                {user && (user.role || '').toLowerCase() === 'researcher' && (
                                    <Link
                                        to="/fund-requests"
                                        className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/18"
                                    >
                                        <HandCoins className="h-4 w-4" aria-hidden />
                                        My Fund Requests
                                    </Link>
                                )}
                                {user && (user.role || '').toLowerCase() === 'researcher' && (
                                    <Link
                                        to="/researcher/wallet"
                                        className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/18"
                                    >
                                        <Wallet className="h-4 w-4" aria-hidden />
                                        My Wallet
                                    </Link>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[24rem]">
                            <div className="rounded-[1.25rem] border border-white/18 bg-white/12 p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-50">Open requests</div>
                                <div className="mt-3 text-3xl font-bold text-white">{requests.length}</div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Funding opportunities currently live</p>
                            </div>
                            <div className="rounded-[1.25rem] border border-white/18 bg-white/12 p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-50">Active studies</div>
                                <div className="mt-3 text-3xl font-bold text-white">
                                    {requests.filter((req) => Number(req.targetAmount || 0) > Number(req.raisedAmount || 0)).length}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Requests still open for support</p>
                            </div>
                            <div className="rounded-[1.25rem] border border-white/18 bg-white/12 p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-sm">
                                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-50">Community funding</div>
                                <div className="mt-3 text-3xl font-bold text-white">
                                    LKR {requests.reduce((sum, req) => sum + Number(req.raisedAmount || 0), 0).toLocaleString()}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-blue-50/82">Already raised across visible requests</p>
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
                    {success && (
                        <div className="mb-6 rounded-[1.6rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 shadow-sm">
                            {success}
                        </div>
                    )}

                    {requests.length === 0 ? (
                        <div className="rounded-[2rem] border border-blue-200/70 bg-white/80 px-6 py-10 text-center shadow-[0_20px_60px_rgba(37,99,235,0.10)] backdrop-blur-sm">
                            <h2 className="text-xl font-semibold text-slate-900">No fund requests open right now</h2>
                            <p className="mt-3 text-sm leading-7 text-slate-600">
                                There are no fund requests open for contributions at the moment.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            {requests.map((req) => {
                                const raised = Number(req.raisedAmount || 0);
                                const target = Number(req.targetAmount || 0);
                                const remaining = Math.max(0, target - raised);
                                const percentage = getFundingPercentage(raised, target);

                                return (
                                    <article
                                        key={req._id}
                                        className="group flex h-full flex-col rounded-[1.9rem] border border-blue-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(241,247,255,0.98))] p-6 shadow-[0_20px_60px_rgba(37,99,235,0.10)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_28px_70px_rgba(37,99,235,0.16)]"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.1rem] border border-blue-200 bg-blue-50 text-blue-700 shadow-sm">
                                                <HandCoins className="h-5 w-5" aria-hidden />
                                            </div>
                                            <div className="rounded-full border border-blue-200/80 bg-white px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-blue-700 shadow-sm">
                                                {remaining <= 0 ? 'Funded' : 'Open'}
                                            </div>
                                        </div>

                                        <div className="mt-5 flex-1">
                                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                                                {req.experimentId?.title || 'Untitled Experiment'}
                                            </h2>
                                            <p className="mt-2 text-sm font-medium text-blue-700">
                                                by {req.researcherId?.name || 'Researcher'}
                                            </p>
                                            <p className="mt-3 text-sm leading-7 text-slate-600">
                                                {req.reason || 'No description provided.'}
                                            </p>
                                        </div>

                                        <div className="mt-6 rounded-[1.4rem] border border-blue-100 bg-white/90 p-4 shadow-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-700">
                                                    Funding progress
                                                </p>
                                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                                    {percentage}% funded
                                                </span>
                                            </div>
                                            <div className="mt-4 h-3 overflow-hidden rounded-full bg-blue-100">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-700 to-sky-500 transition-all duration-500"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
                                                <span>LKR {raised.toLocaleString()} raised</span>
                                                <span>of LKR {target.toLocaleString()}</span>
                                            </div>

                                            {req.aiPredictionDays !== null &&
                                                req.aiPredictionDays !== undefined &&
                                                remaining > 0 && (
                                                    <div className="mt-4 rounded-[1rem] border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-slate-700">
                                                        <span className="font-semibold text-blue-800">AI outlook:</span>{' '}
                                                        {req.aiPredictionDays === 0
                                                            ? 'Goal reached today!'
                                                            : `${req.aiPredictionDays} days to go`}
                                                    </div>
                                                )}
                                        </div>

                                        <div className="mt-6">
                                            <button
                                                type="button"
                                                className={`inline-flex w-full items-center justify-center gap-2 rounded-[1.15rem] px-4 py-3 text-sm font-semibold transition ${
                                                    remaining <= 0
                                                        ? 'cursor-not-allowed border border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] hover:from-blue-800 hover:to-blue-700'
                                                }`}
                                                onClick={() => openContributeModal(req)}
                                                disabled={remaining <= 0}
                                            >
                                                {remaining <= 0
                                                    ? 'Fully Funded'
                                                    : `Contribute (LKR ${remaining.toLocaleString()} remaining)`}
                                                {remaining > 0 && <ArrowRight className="h-4 w-4" aria-hidden />}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {selectedReq && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
                    onClick={closeContributeModal}
                >
                    <div
                        className="w-full max-w-lg rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.96))] p-6 shadow-[0_32px_80px_-34px_rgba(15,23,42,0.38)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Make a contribution</h2>
                                <p className="mt-2 text-sm leading-7 text-slate-600">
                                    Support <span className="font-semibold text-slate-900">{selectedReq.experimentId?.title || 'this experiment'}</span> with a secure payment.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                                onClick={closeContributeModal}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mt-5 rounded-[1.25rem] border border-blue-100 bg-white/90 px-4 py-4 text-sm text-slate-700 shadow-sm">
                            <div className="font-semibold text-slate-900">{selectedReq.experimentId?.title || 'Experiment'}</div>
                            <div className="mt-1">
                                Remaining: LKR{' '}
                                {Math.max(
                                    0,
                                    Number(selectedReq.targetAmount || 0) -
                                        Number(selectedReq.raisedAmount || 0)
                                ).toLocaleString()}
                            </div>
                        </div>

                        <form onSubmit={handleContribute} className="mt-6 space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Amount (LKR)</label>
                                <input
                                    type="number"
                                    className="block w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    min={1}
                                    max={Math.max(
                                        0,
                                        Number(selectedReq.targetAmount || 0) -
                                            Number(selectedReq.raisedAmount || 0)
                                    )}
                                    value={contributeAmount}
                                    onChange={(e) => setContributeAmount(e.target.value)}
                                    placeholder="Enter amount to contribute"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Notes (optional)</label>
                                <textarea
                                    className="block w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    rows={3}
                                    value={contributeNotes}
                                    onChange={(e) => setContributeNotes(e.target.value)}
                                    placeholder="Leave a message for the researcher..."
                                />
                            </div>

                            <div className="flex flex-wrap justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    onClick={closeContributeModal}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-[1rem] bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:from-blue-800 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                                    disabled={contributing}
                                >
                                    {contributing ? 'Processing...' : 'Pay with Stripe'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default OpenFundRequests;
