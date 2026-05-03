import api from './api';

// ── Fund Requests (Researcher) ──────────────────────────────────────
export const getMyFundRequests = () => api.get('/fund-requests/my');
export const getFundRequestById = (id) => api.get(`/fund-requests/${id}`);
export const createFundRequest = (data) => api.post('/fund-requests', data);
export const updateFundRequest = (id, data) => api.patch(`/fund-requests/${id}`, data);
export const deleteFundRequest = (id) => api.delete(`/fund-requests/${id}`);

// ── Open Fund Requests (Public / Donor) ─────────────────────────────
export const getOpenFundRequests = () => api.get('/fund-requests/open');

// ── Contributions ───────────────────────────────────────────────────
export const getMyContributions = () => api.get('/contributions/my');

// ── Payments (Stripe) ───────────────────────────────────────────────
export const createPayment = (data) => api.post('/payments/create', data);
export const getPaymentStatus = (orderId) => api.get(`/payments/status/${orderId}`);
export const verifyStripePayment = (sessionId) => api.get(`/payments/verify-stripe/${sessionId}`);
export const devConfirmPayment = (orderId) => api.post(`/payments/dev-confirm/${orderId}`);

// ── Wallet ──────────────────────────────────────────────────────────
export const getExperimentWallet = (experimentId) => api.get(`/experiments/${experimentId}/wallet`);

// ── Admin Fund Requests ─────────────────────────────────────────────
export const getAllFundRequests = (params) => api.get('/admin/fund-requests', { params });
export const updateFundRequestStatus = (id, data) => api.patch(`/admin/fund-requests/${id}/status`, data);