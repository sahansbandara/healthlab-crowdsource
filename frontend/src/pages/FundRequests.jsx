import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { getMyFundRequests, createFundRequest, updateFundRequest, deleteFundRequest } from '../api/funds';
import './FundRequests.css';

const FundRequests = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user._id || user.id;

    const [requests, setRequests] = useState([]);
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [viewingId, setViewingId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [form, setForm] = useState({
        experimentId: '',
        targetAmount: '',
        reason: '',
    });

    useEffect(() => {
        if (!userId || (user.role || '').toLowerCase() !== 'researcher') {
            navigate('/login');
            return;
        }
        fetchRequests();
        fetchMyExperiments();
    }, [userId, user.role]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await getMyFundRequests();
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load fund requests.');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyExperiments = async () => {
        try {
            const { data } = await api.get('/experiments');
            const mine = Array.isArray(data) ? data.filter((e) => String(e.ownerId || e.createdBy) === String(userId)) : [];
            setExperiments(mine);
        } catch {
            // non-critical
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setViewingId(null);
        setForm({ experimentId: '', targetAmount: '', reason: '' });
        setFormOpen(true);
    };

    const openView = (req) => {
        setViewingId(req._id);
        setEditingId(null);
        setForm({
            experimentId: req.experimentId?._id || req.experimentId || '',
            targetAmount: req.targetAmount,
            reason: req.reason || '',
        });
        setFormOpen(true);
    };

    const openEdit = (req) => {
        setEditingId(req._id);
        setViewingId(null);
        setForm({
            experimentId: req.experimentId?._id || req.experimentId || '',
            targetAmount: req.targetAmount,
            reason: req.reason || '',
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
            [name]: name === 'targetAmount' ? (value === '' ? '' : Number(value)) : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.experimentId || !form.targetAmount || !form.reason.trim()) {
            setError('All fields are required.');
            return;
        }
        try {
            setSubmitting(true);
            setError('');
            if (editingId) {
                await updateFundRequest(editingId, {
                    targetAmount: form.targetAmount,
                    reason: form.reason.trim(),
                });
            } else {
                await createFundRequest({
                    experimentId: form.experimentId,
                    targetAmount: form.targetAmount,
                    reason: form.reason.trim(),
                });
            }
            closeForm();
            fetchRequests();
        } catch (err) {
            setError(err.response?.data?.message || (editingId ? 'Failed to update request.' : 'Failed to create request.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            setSubmitting(true);
            setError('');
            await deleteFundRequest(id);
            setDeleteConfirmId(null);
            fetchRequests();
            if (viewingId === id || editingId === id) closeForm();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete request.');
        } finally {
            setSubmitting(false);
        }
    };

    const getExperimentTitle = (req) => {
        if (req.experimentId?.title) return req.experimentId.title;
        const exp = experiments.find((e) => e._id === (req.experimentId?._id || req.experimentId));
        return exp?.title || 'Unknown Experiment';
    };

    const pct = (raised, target) => target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

    const isView = !!viewingId;
    const isEdit = !!editingId;

    if (!userId) return null;

    return (
        <div className="fund-requests-page">
            <section className="fund-requests-hero">
                <div className="fund-requests-hero-overlay" aria-hidden />
                <div className="fund-requests-hero-inner">
                    <h1>💰 My Fund Requests</h1>
                    <p className="subtitle">Create, track, and manage funding for your experiments.</p>
                    <button type="button" className="btn btn-primary create-btn" onClick={openCreate}>
                        + New Fund Request
                    </button>
                </div>
            </section>

            {error && <div className="fund-error">{error}</div>}

            {loading ? (
                <div className="fund-loading">Loading your fund requests...</div>
            ) : (
                <div className="fund-table-wrap">
                    {requests.length === 0 ? (
                        <p className="fund-empty">You have no fund requests yet. Create one to get started.</p>
                    ) : (
                        <table className="fund-table">
                            <thead>
                                <tr>
                                    <th>Experiment</th>
                                    <th>Status</th>
                                    <th>Target</th>
                                    <th>Progress</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req) => (
                                    <tr key={req._id}>
                                        <td className="title-cell">{getExperimentTitle(req)}</td>
                                        <td>
                                            <span className={`fund-badge status-${req.status}`}>{req.status?.replace(/_/g, ' ')}</span>
                                        </td>
                                        <td className="fund-amount">LKR {req.targetAmount?.toLocaleString()}</td>
                                        <td>
                                            <div className="fund-progress-wrap">
                                                <div className="fund-progress-bar">
                                                    <div className="fund-progress-bar-fill" style={{ width: `${pct(req.raisedAmount, req.targetAmount)}%` }} />
                                                </div>
                                                <span className="fund-progress-label">
                                                    <span className="fund-raised">LKR {(req.raisedAmount || 0).toLocaleString()}</span> / {req.targetAmount?.toLocaleString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}</td>
                                        <td className="actions-cell">
                                            <button type="button" className="btn btn-view" onClick={() => openView(req)}>View</button>
                                            {['DRAFT', 'SUBMITTED'].includes(req.status) && (
                                                <button type="button" className="btn btn-edit" onClick={() => openEdit(req)}>Edit</button>
                                            )}
                                            {deleteConfirmId === req._id ? (
                                                <>
                                                    <span className="confirm-text">Delete?</span>
                                                    <button type="button" className="btn btn-delete-confirm" onClick={() => handleDelete(req._id)} disabled={submitting}>Yes</button>
                                                    <button type="button" className="btn btn-cancel" onClick={() => setDeleteConfirmId(null)}>No</button>
                                                </>
                                            ) : (
                                                ['DRAFT', 'SUBMITTED'].includes(req.status) && (
                                                    <button type="button" className="btn btn-delete" onClick={() => setDeleteConfirmId(req._id)}>Delete</button>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {formOpen && (
                <div className="fund-modal-overlay" onClick={closeForm}>
                    <div className="fund-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="fund-modal-header">
                            <h2>{isView ? 'View Fund Request' : isEdit ? 'Edit Fund Request' : 'New Fund Request'}</h2>
                            <button type="button" className="btn-close" onClick={closeForm} aria-label="Close">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="fund-form">
                            <div className="form-group">
                                <label className="form-label">Experiment</label>
                                {isView || isEdit ? (
                                    <input
                                        className="form-input"
                                        value={getExperimentTitle({ experimentId: form.experimentId })}
                                        readOnly
                                    />
                                ) : (
                                    <select name="experimentId" className="form-select" value={form.experimentId} onChange={handleChange} required>
                                        <option value="">Select an experiment</option>
                                        {experiments.map((exp) => (
                                            <option key={exp._id} value={exp._id}>{exp.title}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Target Amount (LKR)</label>
                                <input
                                    name="targetAmount"
                                    type="number"
                                    min={1}
                                    className="form-input"
                                    value={form.targetAmount}
                                    onChange={handleChange}
                                    required
                                    readOnly={isView}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Reason / Justification</label>
                                <textarea
                                    name="reason"
                                    className="form-input"
                                    rows={4}
                                    value={form.reason}
                                    onChange={handleChange}
                                    required
                                    readOnly={isView}
                                    placeholder="Explain why funding is needed for this experiment..."
                                />
                            </div>

                            {isView && (
                                <div style={{ marginTop: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <span className={`fund-badge status-${form.status || requests.find(r => r._id === viewingId)?.status}`}>
                                            {(requests.find(r => r._id === viewingId)?.status || '').replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    {(() => {
                                        const r = requests.find(r => r._id === viewingId);
                                        return r ? (
                                            <div className="form-group">
                                                <label className="form-label">Funding Progress</label>
                                                <div className="fund-progress-wrap">
                                                    <div className="fund-progress-bar">
                                                        <div className="fund-progress-bar-fill" style={{ width: `${pct(r.raisedAmount, r.targetAmount)}%` }} />
                                                    </div>
                                                    <span className="fund-progress-label">
                                                        <span className="fund-raised">LKR {(r.raisedAmount || 0).toLocaleString()}</span> / {r.targetAmount?.toLocaleString()} ({pct(r.raisedAmount, r.targetAmount)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                    {requests.find(r => r._id === viewingId)?.adminDecisionNote && (
                                        <div className="form-group">
                                            <label className="form-label">Admin Note</label>
                                            <p style={{ color: 'var(--text-secondary)' }}>{requests.find(r => r._id === viewingId).adminDecisionNote}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isView && (
                                <div className="fund-form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                                        {submitting ? 'Saving...' : isEdit ? 'Update' : 'Submit Request'}
                                    </button>
                                </div>
                            )}
                            {isView && (
                                <div className="fund-form-actions">
                                    {['DRAFT', 'SUBMITTED'].includes(requests.find(r => r._id === viewingId)?.status) && (
                                        <button type="button" className="btn btn-secondary" onClick={() => {
                                            const r = requests.find(r => r._id === viewingId);
                                            if (r) openEdit(r);
                                        }}>Edit</button>
                                    )}
                                    <button type="button" className="btn btn-primary" onClick={closeForm}>Close</button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FundRequests;
