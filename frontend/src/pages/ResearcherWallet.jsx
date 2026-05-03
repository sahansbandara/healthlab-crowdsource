import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { getExperimentWallet, getMyFundRequests } from '../api/funds';
import './ResearcherWallet.css';

const ResearcherWallet = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user._id || user.id;

    const [wallets, setWallets] = useState([]);
    const [selectedExpId, setSelectedExpId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!userId || (user.role || '').toLowerCase() !== 'researcher') {
            navigate('/login');
            return;
        }
        fetchWallets();
    }, [userId, user.role]);

    const fetchWallets = async () => {
        try {
            setLoading(true);
            setError('');

            // 1. Get researcher's own experiments
            const { data: allExperiments } = await api.get('/experiments');
            const myExperiments = Array.isArray(allExperiments)
                ? allExperiments.filter((e) => String(e.ownerId || e.createdBy) === String(userId))
                : [];

            // 2. Fetch all fund requests for this researcher
            const { data: myFundRequests } = await getMyFundRequests();

            // 3. Fetch wallet for each experiment and merge with fund info
            const walletResults = await Promise.allSettled(
                myExperiments
                    .filter(exp => myFundRequests.some(fr => (fr.experimentId?._id || fr.experimentId) === String(exp._id)))
                    .map(async (exp) => {
                        try {
                            const { data: walletData } = await getExperimentWallet(exp._id);
                            // Find related fund request
                            const fundReq = (myFundRequests || []).find(r =>
                                (r.experimentId?._id || r.experimentId) === exp._id &&
                                ['OPEN_FOR_FUNDING', 'FUNDED', 'CLOSED'].includes(r.status)
                            );
                            return { experiment: exp, wallet: walletData, fundReq };
                        } catch {
                            return { experiment: exp, wallet: null, fundReq: null };
                        }
                    })
            );

            const allWallets = walletResults
                .filter((r) => r.status === 'fulfilled')
                .map((r) => r.value);

            setWallets(allWallets);
            if (allWallets.length > 0 && !selectedExpId) {
                // Auto-select first funded experiment if exists
                const firstFunded = allWallets.find(w => w.wallet && w.wallet.balance > 0);
                if (firstFunded) setSelectedExpId(firstFunded.experiment._id);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load wallet information.');
        } finally {
            setLoading(false);
        }
    };

    const totalBalance = wallets.reduce((sum, w) => sum + (w.wallet?.balance || 0), 0);
    const walletsWithBalance = wallets.filter((w) => w.wallet && w.wallet.balance > 0);
    const selectedData = walletsWithBalance.find(w => w.experiment._id === selectedExpId);

    const calcPct = (raised, target) => target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

    if (!userId) return null;

    return (
        <div className="researcher-wallet-page">
            <section className="wallet-hero">
                <div className="wallet-hero-overlay" aria-hidden />
                <div className="wallet-hero-inner">
                    <h1>💰 My Wallet</h1>
                    <p className="subtitle">Track funding received for your experiments.</p>
                </div>
            </section>

            {/* Total Balance Card */}
            <div className="wallet-total-card">
                <div className="wallet-total-icon">🏦</div>
                <div className="wallet-total-info">
                    <span className="wallet-total-label">Total Balance</span>
                    <span className="wallet-total-amount">
                        LKR {totalBalance.toLocaleString()}
                    </span>
                </div>
                <div className="wallet-total-count">
                    {walletsWithBalance.length} experiment{walletsWithBalance.length !== 1 ? 's' : ''} funded
                </div>
            </div>

            {error && <div className="wallet-error">{error}</div>}

            {loading ? (
                <div className="wallet-loading">Loading your wallet...</div>
            ) : (
                <div className="wallet-table-wrap">
                    {walletsWithBalance.length === 0 ? (
                        <p className="wallet-empty">
                            {wallets.length === 0
                                ? "You don't have any experiments yet. Create an experiment and set up funding to see your wallet here."
                                : "You have experiments, but none of them have received funding yet."}
                        </p>
                    ) : (
                        <table className="wallet-table">
                            <thead>
                                <tr>
                                    <th>Experiment</th>
                                    <th>Status</th>
                                    <th>Wallet Balance</th>
                                    <th>% Goal</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {walletsWithBalance.map(({ experiment, wallet, fundReq }) => (
                                    <tr
                                        key={experiment._id}
                                        className="wallet-row-clickable"
                                        onClick={() => navigate(`/researcher/wallet/${experiment._id}`)}
                                    >
                                        <td className="title-cell">
                                            <div className="title-with-icon">
                                                {experiment.title}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`wallet-badge status-${experiment.status}`}>
                                                {experiment.status}
                                            </span>
                                        </td>
                                        <td className="wallet-balance">
                                            LKR {wallet.balance.toLocaleString()}
                                        </td>
                                        <td className="goal-pct-cell">
                                            {fundReq ? (
                                                <span className="goal-pct">
                                                    {calcPct(fundReq.raisedAmount, fundReq.targetAmount)}%
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td>
                                            {wallet.lastUpdatedAt
                                                ? new Date(wallet.lastUpdatedAt).toLocaleDateString()
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default ResearcherWallet;
