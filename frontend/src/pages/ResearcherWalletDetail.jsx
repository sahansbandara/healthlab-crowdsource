import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import { getExperimentWallet, getMyFundRequests } from '../api/funds';
import { jsPDF } from 'jspdf';
import './ResearcherWallet.css';

const ResearcherWalletDetail = () => {
    const { experimentId } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user._id || user.id;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!userId || (user.role || '').toLowerCase() !== 'researcher') {
            navigate('/login');
            return;
        }
        fetchDetail();
    }, [experimentId, userId]);

    const fetchDetail = async () => {
        try {
            setLoading(true);
            setError('');

            // 1. Get experiment basic info
            const { data: experiment } = await api.get(`/experiments/${experimentId}`);

            // 2. Get wallet info
            const { data: wallet } = await getExperimentWallet(experimentId);

            // 3. Get fund request info
            const { data: myFundRequests } = await getMyFundRequests();
            const fundReq = (myFundRequests || []).find(r =>
                (r.experimentId?._id || r.experimentId) === experimentId &&
                ['OPEN_FOR_FUNDING', 'FUNDED', 'CLOSED'].includes(r.status)
            );

            setData({ experiment, wallet, fundReq });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load experiment details.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        try {
            const element = document.getElementById('pdf-content');
            if (!element) {
                console.error('Element #pdf-content not found');
                return;
            }

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            doc.html(element, {
                margin: [10, 10, 10, 10],
                autoPaging: 'text',
                html2canvas: {
                    scale: 0.6,
                    useCORS: true,
                    logging: false,
                },
                callback: (pdf) => {
                    pdf.save(`Funding_Report_${experimentId}.pdf`);
                },
            });
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate PDF. Please check the console for details.');
        }
    };

    const calcPct = (raised, target) => target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

    if (loading) return <div className="wallet-loading">Loading details...</div>;
    if (error) return <div className="wallet-error">{error}</div>;
    if (!data) return <div className="wallet-empty">No data found.</div>;

    const { experiment, wallet, fundReq } = data;
    const percentage = fundReq ? calcPct(fundReq.raisedAmount, fundReq.targetAmount) : 0;

    // SVG Donut Logic
    const radius = 70;
    const stroke = 12;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="researcher-wallet-page">
            <section className="wallet-hero">
                <div className="wallet-hero-overlay" aria-hidden />
                <div className="wallet-hero-inner">
                    <div className="hero-top-nav">
                        <Link to="/researcher/wallet" className="btn-back">← Back to Wallet</Link>
                        <button onClick={handleDownloadPDF} className="btn-download-pdf">
                            📥 Download PDF Report
                        </button>
                    </div>
                    <h1>📊 Funding Graph</h1>
                    <p className="subtitle">{experiment.title}</p>
                </div>
            </section>

            <div className="wallet-detail-container" id="pdf-content">
                <div className="wallet-detail-panel standalone">
                    <div className="detail-header">
                        <h3>📈 Funding Performance</h3>
                        <span className="detail-status-pill">{fundReq?.status.replace(/_/g, ' ') || experiment.status}</span>
                    </div>

                    <div className="funding-graph-container">
                        <div className="graph-stats">
                            <div className="stat-item">
                                <span className="stat-label">Raised Amount</span>
                                <span className="stat-value">LKR {fundReq?.raisedAmount.toLocaleString() || '0'}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Target Goal</span>
                                <span className="stat-value">LKR {fundReq?.targetAmount.toLocaleString() || '—'}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Completion</span>
                                <span className="stat-value highlight">{percentage}%</span>
                            </div>
                            {fundReq?.aiPredictionDays !== null && fundReq?.aiPredictionDays !== undefined && fundReq?.raisedAmount < fundReq?.targetAmount && (
                                <div className="stat-item prediction">
                                    <span className="stat-label">AI Forecast</span>
                                    <span className="stat-value ai-highlight">~ {fundReq.aiPredictionDays} Days Left</span>
                                </div>
                            )}
                        </div>

                        <div className="funding-progress-detailed">
                            <div className="progress-track">
                                <div
                                    className="progress-fill-gradient"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <div className="progress-markers">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        <div className="additional-info-grid">
                            <div className="info-box">
                                <span className="info-label">Current Balance</span>
                                <span className="info-value">LKR {wallet?.balance.toLocaleString() || '0'}</span>
                            </div>
                            <div className="info-box">
                                <span className="info-label">Currency</span>
                                <span className="info-value">LKR</span>
                            </div>
                            <div className="info-box">
                                <span className="info-label">Last Activity</span>
                                <span className="info-value">{wallet?.lastUpdatedAt ? new Date(wallet.lastUpdatedAt).toLocaleDateString() : 'No activity'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="wallet-side-panel">
                    <div className="pie-chart-card">
                        <h3>Funding Distribution</h3>
                        <div className="pie-chart-container">
                            <svg
                                height={radius * 2}
                                width={radius * 2}
                                className="donut-svg"
                            >
                                <circle
                                    stroke="rgba(0,0,0,0.05)"
                                    fill="transparent"
                                    strokeWidth={stroke}
                                    r={normalizedRadius}
                                    cx={radius}
                                    cy={radius}
                                />
                                <circle
                                    stroke="#2563eb"
                                    fill="transparent"
                                    strokeWidth={stroke}
                                    strokeDasharray={circumference + ' ' + circumference}
                                    style={{ strokeDashoffset }}
                                    strokeLinecap="round"
                                    r={normalizedRadius}
                                    cx={radius}
                                    cy={radius}
                                    className="donut-ring-progress"
                                />
                                <text
                                    x="50%"
                                    y="50%"
                                    dy=".3em"
                                    textAnchor="middle"
                                    className="donut-text"
                                >
                                    {percentage}%
                                </text>
                            </svg>
                            <div className="pie-legend">
                                <div className="legend-item">
                                    <span className="dot dot-funded"></span>
                                    <span>Funded</span>
                                </div>
                                <div className="legend-item">
                                    <span className="dot dot-remaining"></span>
                                    <span>Remaining</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResearcherWalletDetail;
