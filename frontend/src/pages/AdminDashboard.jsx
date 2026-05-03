import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
  Button,
  Card,
  Badge,
  Modal,
  Textarea,
  ErrorMessage,
  EmptyState,
  TableRowSkeleton,
} from '../components/ui';
import { Users, UserCheck, Clock, Search, Download, Calendar, Filter, FileSpreadsheet, PieChart as PieChartIcon, LayoutDashboard, Database, Activity, Check, X, Ban, Flag } from 'lucide-react';
import StatCard from '../components/admin/StatCard';
import { TrendChart, DistributionChart, QualificationChart } from '../components/admin/DashboardCharts';
import AdminReports from './AdminReports';

const TAB_OVERVIEW = 'overview';
const TAB_RESEARCHERS = 'researchers';
const TAB_ALL_USERS = 'users';
const TAB_EXPERIMENTS = 'experiments';
const TAB_REPORTS = 'reports';
const TAB_FUND_REQUESTS = 'fund_requests';

const toObjectCounts = (value) => {
  if (!value) return {};
  if (Array.isArray(value)) {
    return value.reduce((acc, row) => {
      const key = String(row?.name || row?._id || '').trim();
      if (!key) return acc;
      const count = Number(row?.value ?? row?.count ?? 0);
      acc[key] = Number.isFinite(count) ? count : 0;
      return acc;
    }, {});
  }
  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [k, v]) => {
      const count = Number(v ?? 0);
      acc[k] = Number.isFinite(count) ? count : 0;
      return acc;
    }, {});
  }
  return {};
};

const normalizeOverviewAnalytics = (raw) => {
  const payload = raw?.data && typeof raw.data === 'object' ? raw.data : raw;
  if (!payload || typeof payload !== 'object') return null;

  const userRoles = toObjectCounts(payload.userRoles || payload.roleDistribution || {});
  const researcherStatus = toObjectCounts(payload.researcherStatus || payload.statusCounts || {});

  const statusKeys = Object.keys(researcherStatus);
  const approvedResearchers = statusKeys.reduce((sum, key) => (
    key.toLowerCase() === 'approved' ? sum + Number(researcherStatus[key] || 0) : sum
  ), 0);
  const pendingResearchers = statusKeys.reduce((sum, key) => (
    key.toLowerCase() === 'pending' ? sum + Number(researcherStatus[key] || 0) : sum
  ), 0);
  const rejectedResearchers = statusKeys.reduce((sum, key) => (
    key.toLowerCase() === 'rejected' ? sum + Number(researcherStatus[key] || 0) : sum
  ), 0);

  const summary = {
    totalUsers: Number(payload.summary?.totalUsers ?? payload.totalUsers ?? 0),
    totalResearchers: Number(payload.summary?.totalResearchers ?? payload.totalResearchers ?? 0),
    pendingResearchers: Number(payload.summary?.pendingResearchers ?? pendingResearchers ?? 0),
    approvedResearchers: Number(payload.summary?.approvedResearchers ?? approvedResearchers ?? 0),
    rejectedResearchers: Number(payload.summary?.rejectedResearchers ?? rejectedResearchers ?? 0),
    growthRate: Number(payload.summary?.growthRate ?? payload.growthRate ?? 0),
    newUsersThisWeek: Number(payload.summary?.newUsersThisWeek ?? payload.newUsersThisWeek ?? 0),
  };

  const registrationTrendRaw = Array.isArray(payload.registrationTrend)
    ? payload.registrationTrend
    : Array.isArray(payload.trend)
      ? payload.trend
      : [];

  const registrationTrend = registrationTrendRaw.map((row) => ({
    date: row?.date || row?._id || row?.label || '',
    count: Number(row?.count ?? row?.value ?? 0),
  })).filter((row) => row.date);

  const qualificationsRaw = Array.isArray(payload.qualifications)
    ? payload.qualifications
    : Array.isArray(payload.qualificationDistribution)
      ? payload.qualificationDistribution
      : [];

  const qualifications = qualificationsRaw.map((row) => ({
    name: row?.name || row?._id || 'Unspecified',
    count: Number(row?.count ?? row?.value ?? 0),
  }));

  return {
    summary,
    registrationTrend,
    userRoles,
    researcherStatus,
    qualifications,
  };
};

const getBackendOrigin = () => {
  try {
    return new URL(api?.defaults?.baseURL || '').origin;
  } catch (err) {
    return window.location.origin;
  }
};

const getAffiliationProofUrl = (rawPath) => {
  if (!rawPath) return '';
  const value = String(rawPath).trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;

  let normalized = value.replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalized.startsWith('uploads/')) {
    if (normalized.startsWith('affiliation-proofs/')) {
      normalized = `uploads/${normalized}`;
    } else {
      const fileName = normalized.split('/').pop();
      normalized = fileName ? `uploads/affiliation-proofs/${fileName}` : 'uploads/affiliation-proofs';
    }
  }

  return `${getBackendOrigin()}/${normalized}`;
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState(TAB_OVERVIEW);
  const [researchers, setResearchers] = useState([]);
  const [researcherStatusFilter, setResearcherStatusFilter] = useState('');
  const [researchersLoading, setResearchersLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [detailModalResearcher, setDetailModalResearcher] = useState(null);
  const [deleteResearcherModal, setDeleteResearcherModal] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [experiments, setExperiments] = useState([]);
  const [experimentsLoading, setExperimentsLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteUserModal, setDeleteUserModal] = useState(null);
  const [error, setError] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [detailReviewNotes, setDetailReviewNotes] = useState('');

  // Fund Request states
  const [fundRequests, setFundRequests] = useState([]);
  const [fundRequestsLoading, setFundRequestsLoading] = useState(false);
  const [fundRequestStatusFilter, setFundRequestStatusFilter] = useState('');
  const [updateFundRequestModal, setUpdateFundRequestModal] = useState(null);
  const [fundRequestDecisionNote, setFundRequestDecisionNote] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');

  // New states for expanded functionality
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30'); // '7', '30', 'all'

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser._id;

  useEffect(() => {
    if (activeTab === TAB_OVERVIEW) fetchAnalytics();
    if (activeTab === TAB_RESEARCHERS) fetchResearchers();
    if (activeTab === TAB_ALL_USERS) fetchAllUsers();
    if (activeTab === TAB_EXPERIMENTS) fetchExperiments();
    if (activeTab === TAB_FUND_REQUESTS) fetchFundRequests();
  }, [activeTab, researcherStatusFilter, roleFilter, dateRange, fundRequestStatusFilter]);

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const days = dateRange === 'all' ? 365 : parseInt(dateRange);
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log(`[fetchAnalytics] Starting fetch. Token: ${token ? 'YES' : 'NO'}, User: ${user.email}, Days: ${days}`);

      const [analyticsResponse, usersResponse, experimentsResponse] = await Promise.all([
        api.get(`/admin/analytics?days=${days}`),
        api.get('/admin/users'),
        api.get('/experiments'),
      ]);

      console.log(`[fetchAnalytics] All requests successful`);
      const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];
      const experimentList = Array.isArray(experimentsResponse.data) ? experimentsResponse.data : [];
      setAnalytics(normalizeOverviewAnalytics(analyticsResponse.data));
      setAllUsers(users);
      setExperiments(enrichExperimentsWithResearchers(experimentList, users));
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      console.error('Error details:', err.response?.status, err.response?.data, err.message);
      setError('Failed to fetch analytics statistics.');
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchResearchers = async () => {
    try {
      setResearchersLoading(true);
      const params = researcherStatusFilter ? { status: researcherStatusFilter } : {};
      const response = await api.get('/admin/researchers', { params });
      setResearchers(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching researchers:', err);
      setError('Failed to fetch researchers.');
    } finally {
      setResearchersLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      setUsersLoading(true);
      const params = roleFilter ? { role: roleFilter } : {};
      const response = await api.get('/admin/users', { params });
      setAllUsers(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users.');
    } finally {
      setUsersLoading(false);
    }
  };

  const enrichExperimentsWithResearchers = (experimentList, users) => {
    const userNameById = users.reduce((acc, user) => {
      if (user?._id) acc[String(user._id)] = user.name || user.fullName || '';
      return acc;
    }, {});

    return experimentList.map((exp) => {
      const ownerRef = exp?.ownerId;
      const ownerId = ownerRef && typeof ownerRef === 'object'
        ? ownerRef._id
        : (exp?.ownerId || exp?.createdBy || null);

      const ownerName = ownerRef && typeof ownerRef === 'object'
        ? (ownerRef.name || ownerRef.fullName || '')
        : (ownerId ? userNameById[String(ownerId)] : '');

      return {
        ...exp,
        researcherId: ownerId ? String(ownerId) : '',
        researcherName: ownerName || 'Unknown researcher',
      };
    });
  };

  const fetchExperiments = async () => {
    try {
      setExperimentsLoading(true);
      const [experimentsResponse, usersResponse] = await Promise.all([
        api.get('/experiments'),
        api.get('/admin/users'),
      ]);

      const experimentList = Array.isArray(experimentsResponse.data) ? experimentsResponse.data : [];
      const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];
      setExperiments(enrichExperimentsWithResearchers(experimentList, users));
      setError(null);
    } catch (err) {
      console.error('Error fetching experiments:', err);
      setError('Failed to fetch experiments.');
    } finally {
      setExperimentsLoading(false);
    }
  };

  const fetchFundRequests = async () => {
    try {
      setFundRequestsLoading(true);
      const params = fundRequestStatusFilter ? { status: fundRequestStatusFilter } : {};
      const response = await api.get('/admin/fund-requests', { params });
      setFundRequests(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching fund requests:', err);
      setError('Failed to fetch fund requests.');
    } finally {
      setFundRequestsLoading(false);
    }
  };

  const handleUpdateFundRequestStatus = async (requestId, status, decisionNote, amount) => {
    try {
      await api.patch(`/admin/fund-requests/${requestId}/status`, {
        status,
        adminDecisionNote: decisionNote,
        approvedAmount: amount ? Number(amount) : undefined,
      });
      setUpdateFundRequestModal(null);
      setFundRequestDecisionNote('');
      setApprovedAmount('');
      fetchFundRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update fund request status.');
    }
  };

  const handleApproveResearcher = async (researcherId, notes) => {
    try {
      await api.put(`/admin/researchers/${researcherId}/approve`, { reviewNotes: notes || '' });
      setReviewModal(null);
      setDetailModalResearcher(null);
      setReviewNotes('');
      setDetailReviewNotes('');
      fetchResearchers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve researcher.');
    }
  };

  const handleRejectResearcher = async (researcherId, notes) => {
    try {
      await api.put(`/admin/researchers/${researcherId}/reject`, { reviewNotes: notes || '' });
      setReviewModal(null);
      setDetailModalResearcher(null);
      setReviewNotes('');
      setDetailReviewNotes('');
      fetchResearchers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject researcher.');
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      await api.patch(`/admin/users/approve/${userId}`);
      fetchAllUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve.');
    }
  };

  const handleRejectUser = async (userId) => {
    try {
      await api.patch(`/admin/users/reject/${userId}`);
      fetchAllUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject.');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserModal) return;
    const userId = deleteUserModal._id;
    try {
      await api.delete(`/admin/users/${userId}`);
      setDeleteUserModal(null);
      fetchAllUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleDeleteResearcher = async () => {
    if (!deleteResearcherModal) return;
    const researcherId = deleteResearcherModal._id;
    try {
      await api.delete(`/admin/researchers/${researcherId}`);
      setDeleteResearcherModal(null);
      fetchResearchers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove researcher.');
    }
  };

  const handleDeleteExperiment = async () => {
    if (!deleteModal) return;
    const { experiment, rejectResearcher, reassignToParticipant } = deleteModal;
    try {
      await api.delete(`/admin/experiments/${experiment._id}`, {
        data: { rejectResearcher: !!rejectResearcher, reassignToParticipant: !!reassignToParticipant },
      });
      setDeleteModal(null);
      fetchExperiments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete experiment.');
    }
  };

  const handleExportCsv = () => {
    const dataToExport = activeTab === TAB_RESEARCHERS ? filteredResearchers : allUsers;
    if (!dataToExport || dataToExport.length === 0) return;

    const headers = activeTab === TAB_RESEARCHERS
      ? ['ID', 'Name', 'Email', 'Qualification', 'Type', 'Status', 'Registered At']
      : ['Name', 'Email', 'Role', 'Status', 'Registered At'];

    const csvContent = [
      headers.join(','),
      ...dataToExport.map(item => {
        if (activeTab === TAB_RESEARCHERS) {
          return [
            `"${item.status === 'approved' ? (item.researcherId || '') : ''}"`,
            `"${item.fullName || item.user?.name || ''}"`,
            `"${item.user?.email || ''}"`,
            `"${item.highestAcademicQualification || ''}"`,
            `"${item.researcherType || ''}"`,
            `"${item.status || ''}"`,
            `"${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}"`
          ].join(',');
        } else {
          return [
            `"${item.name || ''}"`,
            `"${item.email || ''}"`,
            `"${item.role || ''}"`,
            `"${item.researcherStatus || 'N/A'}"`,
            `"${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}"`
          ].join(',');
        }
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab}-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportOverviewPdf = async () => {
    try {
      const days = dateRange === 'all' ? 365 : parseInt(dateRange, 10);
      const response = await api.get(`/admin/analytics/export/pdf?days=${days}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `overview-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting overview PDF:', err);
      alert(err.response?.data?.message || 'Failed to export overview PDF.');
    }
  };

  const handleExportResearchersPdf = async () => {
    try {
      const response = await api.get('/admin/researchers/export/pdf', {
        responseType: 'blob',
        params: activeTab === TAB_RESEARCHERS && researcherStatusFilter ? { status: researcherStatusFilter } : undefined,
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `researchers-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting researchers PDF:', err);
      alert(err.response?.data?.message || 'Failed to export researchers PDF.');
    }
  };

  const filteredResearchers = researchers.filter(r => {
    const researcherCode = (r.researcherId || '').toLowerCase();
    const name = (r.fullName || r.user?.name || '').toLowerCase();
    const email = (r.user?.email || '').toLowerCase();
    const matchSearch = researcherCode.includes(searchTerm.toLowerCase()) || name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const filteredUsers = allUsers.filter(u => {
    const name = (u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const matchSearch = name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const getStatusVariant = (status) => {
    if (!status) return 'pending';
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'approved';
    if (s === 'rejected') return 'rejected';
    return 'pending';
  };

  const getUserCode = (user, index) => {
    if ((user?.role || '').toLowerCase() === 'admin') return '-';
    return `TT${String(index + 1).padStart(3, '0')}`;
  };

  const getExpertiseTags = (user) => {
    if (Array.isArray(user?.expertise) && user.expertise.length > 0) {
      return user.expertise.slice(0, 3);
    }
    if ((user?.role || '').toLowerCase() === 'admin') return ['developer'];
    if ((user?.role || '').toLowerCase() === 'researcher') return ['research'];
    return ['community'];
  };

  const getUserRep = (user) => Number(user?.reputation ?? user?.rep ?? 0) || 0;

  const getResearcherTypeTag = (researcher) => {
    const type = String(researcher?.researcherType || '').trim();
    if (!type) return 'general';
    return type.toLowerCase().includes('organization') ? 'affiliated' : type.toLowerCase();
  };

  const topResearcher = Object.values(
    experiments.reduce((acc, exp) => {
      const researcherName = exp?.researcherName || 'Unknown researcher';
      const researcherId = exp?.researcherId || researcherName;
      if (!acc[researcherId]) {
        acc[researcherId] = { id: researcherId, name: researcherName, studyCount: 0 };
      }
      acc[researcherId].studyCount += 1;
      return acc;
    }, {})
  ).sort((a, b) => {
    if (b.studyCount !== a.studyCount) return b.studyCount - a.studyCount;
    return a.name.localeCompare(b.name);
  })[0] || null;

  const totalRep = allUsers.reduce((sum, user) => sum + getUserRep(user), 0);
  const averageRep = allUsers.length ? Math.round(totalRep / allUsers.length) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <header className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-cyan-50 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
            <p className="mt-1 text-gray-600">
              Manage researchers, users, experiments, and report operations with one control center.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              {allUsers.length} users
            </span>
            <span className="inline-flex rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              {experiments.length} experiments
            </span>
          </div>
        </div>
      </header>

      <div className="sticky top-4 z-20 mb-6 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            [TAB_OVERVIEW, 'Overview', LayoutDashboard],
            [TAB_RESEARCHERS, 'Researchers', Users],
            [TAB_ALL_USERS, 'All Users', UserCheck],
            [TAB_EXPERIMENTS, 'Experiments', Database],
            [TAB_REPORTS, 'Reports', Flag],
            [TAB_FUND_REQUESTS, 'Fund Requests', Activity],
          ].map(([tab, label, Icon]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ${activeTab === tab
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-slate-50'
                }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} className="mb-4" />}

      {activeTab === TAB_OVERVIEW && (
        <div className="space-y-5 px-1 sm:px-2 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Overview</h2>
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              {[
                { label: '7D', value: '7' },
                { label: '30D', value: '30' },
                { label: '90D', value: '90' },
                { label: 'All', value: 'all' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${dateRange === opt.value
                      ? 'bg-[#8ecae6] text-[#023047] shadow-md'
                      : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {analyticsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : analytics ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#eef5f4] via-[#f8fafc] to-[#f9f6ed] p-3 sm:p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white/85 backdrop-blur-sm p-4 sm:p-5">
                    <span className="inline-flex rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1">
                      Admin Command Center
                    </span>
                    <h3 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                      Admin data summaries.
                    </h3>
                    <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-3xl">
                      Track platform health, compare trust levels, inspect contribution patterns, and export clean reports whenever you need.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        onClick={handleExportOverviewPdf}
                        className="bg-[#8ecae6] hover:bg-[#7bbbd8] text-[#023047] border-[#8ecae6] px-3 py-1.5 text-sm"
                      >
                        <Download size={16} /> Download Summary PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleExportResearchersPdf}
                        className="bg-[#8ecae6] hover:bg-[#7bbbd8] text-[#023047] border-[#8ecae6] px-3 py-1.5 text-sm"
                      >
                        <Users size={16} /> Download Users PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab(TAB_ALL_USERS)}
                        className="bg-[#8ecae6] hover:bg-[#7bbbd8] text-[#023047] border-[#8ecae6] px-3 py-1.5 text-sm"
                      >
                        <UserCheck size={16} /> Open User Manager
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Live Signal</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{analytics.summary?.totalUsers || 0} profiles loaded</p>
                      <p className="mt-1.5 text-xs text-slate-600">
                        {analytics.summary?.approvedResearchers || 0} approved and {analytics.summary?.rejectedResearchers || 0} blocked accounts are reflected in this snapshot.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#023047] bg-[#023047] p-4 text-white">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-[#cfe8f7]">Top Focus</p>
                      <p className="mt-2 text-xl font-bold">{topResearcher?.name || 'No researcher yet'}</p>
                      <p className="mt-1.5 text-xs text-[#d8ecf8]">
                        Researcher with most studies: {topResearcher?.studyCount ?? 0} experiments.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <p className="text-[10px] font-semibold tracking-wide uppercase text-slate-500">Total Users</p>
                  <p className="mt-0.5 text-xl font-semibold text-[#023047] leading-none">{analytics.summary?.totalUsers || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <p className="text-[10px] font-semibold tracking-wide uppercase text-slate-500">Administrators</p>
                  <p className="mt-0.5 text-xl font-semibold text-slate-900 leading-none">{analytics.userRoles?.admin || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <p className="text-[10px] font-semibold tracking-wide uppercase text-slate-500">Active Members</p>
                  <p className="mt-0.5 text-xl font-semibold text-slate-900 leading-none">
                    {Math.max((analytics.summary?.totalUsers || 0) - (analytics.userRoles?.admin || 0), 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <p className="text-[10px] font-semibold tracking-wide uppercase text-slate-500">Banned Members</p>
                  <p className="mt-0.5 text-xl font-semibold text-slate-900 leading-none">{analytics.summary?.rejectedResearchers || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <p className="text-[10px] font-semibold tracking-wide uppercase text-slate-500">Avg. Reputation</p>
                  <p className="mt-0.5 text-xl font-semibold text-slate-900 leading-none">{averageRep}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                  <p className="text-[10px] font-semibold tracking-wide uppercase text-slate-500">Weekly Growth</p>
                  <p className="mt-0.5 text-xl font-semibold text-slate-900 leading-none">{analytics.summary?.newUsersThisWeek || 0}</p>
                </div>
              </div>

              <div className="bg-[#e8f5fb] border border-[#8ecae6] rounded-2xl px-4 py-3 text-sm text-[#023047]">
                Analyzed {analytics.summary?.totalUsers || 0} users and {analytics.summary?.totalResearchers || 0} researchers across {analytics.registrationTrend?.length || 0} days of trend data.
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm min-h-[350px]">
                  <h3 className="font-bold text-slate-800 mb-6">Registration Trend</h3>
                  <div className="h-72 w-full">
                    <TrendChart data={analytics.registrationTrend} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm min-h-[350px]">
                  <h3 className="font-bold text-slate-800 mb-6">Researcher Status</h3>
                  <div className="h-72 w-full">
                    <DistributionChart data={[
                      { name: 'Approved', value: analytics.summary?.approvedResearchers || 0 },
                      { name: 'Pending', value: analytics.summary?.pendingResearchers || 0 },
                      { name: 'Rejected', value: analytics.summary?.rejectedResearchers || 0 },
                    ].filter(d => d.value > 0)} variant="pie" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm min-h-[350px]">
                  <h3 className="font-bold text-slate-800 mb-6">User Role Distribution</h3>
                  <div className="h-72 w-full">
                    <DistributionChart data={Object.entries(analytics.userRoles || {}).map(([name, value]) => ({
                      name: name.charAt(0).toUpperCase() + name.slice(1),
                      value
                    }))} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm min-h-[350px]">
                  <h3 className="font-bold text-slate-800 mb-6">Top Qualifications</h3>
                  <div className="h-72 w-full">
                    <QualificationChart data={(analytics.qualifications || []).slice(0, 8)} />
                  </div>
                </div>
              </div>

            </>
          ) : (
            <EmptyState title="No analytics data" description="Could not load statistics." />
          )}
        </div>
      )}

      {activeTab === TAB_RESEARCHERS && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search researchers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 min-w-[240px]"
                />
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="researcher-status-filter" className="text-sm font-medium text-gray-700">
                  Status:
                </label>
                <select
                  id="researcher-status-filter"
                  value={researcherStatusFilter}
                  onChange={(e) => setResearcherStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent min-w-[140px]"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportResearchersPdf} className="flex items-center gap-2">
                <Download size={16} /> Export PDF
              </Button>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">Total</p>
              <p className="text-3xl font-bold text-slate-800 leading-tight mt-1">{filteredResearchers.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">Pending</p>
              <p className="text-3xl font-bold text-slate-800 leading-tight mt-1">
                {filteredResearchers.filter((r) => (r.status || 'pending').toLowerCase() === 'pending').length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">Approved</p>
              <p className="text-3xl font-bold text-slate-800 leading-tight mt-1">
                {filteredResearchers.filter((r) => (r.status || '').toLowerCase() === 'approved').length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">Rejected</p>
              <p className="text-3xl font-bold text-slate-800 leading-tight mt-1">
                {filteredResearchers.filter((r) => (r.status || '').toLowerCase() === 'rejected').length}
              </p>
            </div>
          </div>
          <Card padding={false} className="overflow-hidden border border-slate-200 bg-[#F8FAFC] shadow-sm rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-x-0 border-spacing-y-2 px-2">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider min-w-[95px] border-b border-slate-100">
                      ID
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider min-w-[230px] border-b border-slate-100">
                      Researcher
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      Qualification
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      Type
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      Status
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      Joined
                    </th>
                    <th className="px-4 py-4 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#F8FAFC]">
                  {researchersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRowSkeleton key={i} cols={7} />
                    ))
                  ) : filteredResearchers.length > 0 ? (
                    filteredResearchers.map((r) => {
                      const s = (r.status || '').toLowerCase();
                      const isPending = s === 'pending' || s === '';
                      return (
                        <tr
                          key={r._id}
                          onClick={() => setDetailModalResearcher(r)}
                          className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                            <span className="inline-flex items-center justify-center min-w-[62px] px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold">
                              {s === 'approved' ? (r.researcherId || '—') : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-800">{r.fullName || (r.user && r.user.name) || '—'}</span>
                              {r.isFlagged && <Badge status="rejected">Flagged</Badge>}
                            </div>
                            <p className="text-slate-500 text-sm mt-1">{r.user?.email || '—'}</p>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {r.highestAcademicQualification || '—'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                              {getResearcherTypeTag(r)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <Badge status={getStatusVariant(r.status)}>{r.status || 'pending'}</Badge>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap justify-end gap-2">
                              {isPending && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="success"
                                    className="px-2 py-1 text-xs gap-1 rounded-md"
                                    onClick={() => setReviewModal({ type: 'approve', researcher: r })}
                                    title="Approve researcher"
                                  >
                                    <Check size={13} />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    className="px-2 py-1 text-xs rounded-md bg-red-700 hover:bg-red-800"
                                    onClick={() => setReviewModal({ type: 'reject', researcher: r })}
                                    title="Reject researcher"
                                  >
                                    <X size={13} />
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="danger"
                                className="px-2 py-1 text-xs rounded-md bg-red-700 hover:bg-red-800"
                                onClick={() => setDeleteResearcherModal(r)}
                                title="Ban researcher"
                              >
                                <Ban size={13} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <EmptyState
                          title="No researchers found"
                          description="Try changing the status filter."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeTab === TAB_ALL_USERS && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 min-w-[240px]"
                />
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="role-filter" className="text-sm font-medium text-gray-700">
                  Role:
                </label>
                <select
                  id="role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent min-w-[160px]"
                >
                  <option value="">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="researcher">Researcher</option>
                  <option value="participant">Participant</option>
                </select>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="flex items-center gap-2">
              <FileSpreadsheet size={16} /> Export CSV
            </Button>
          </div>
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">Total Users</p>
              <p className="text-3xl font-bold text-slate-800 leading-tight mt-1">{filteredUsers.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">Administrators</p>
              <p className="text-3xl font-bold text-slate-800 leading-tight mt-1">
                {filteredUsers.filter((u) => (u.role || '').toLowerCase() === 'admin').length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">Highest Rep</p>
              <p className="text-3xl font-bold text-slate-800 leading-tight mt-1">
                {filteredUsers.reduce((max, u) => Math.max(max, getUserRep(u)), 0)}
              </p>
            </div>
          </div>
          <Card padding={false} className="overflow-hidden border border-slate-200 bg-[#F8FAFC] shadow-sm rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">ID</th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">User</th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">Expertise</th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">Role</th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">Joined</th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">Reputation</th>
                    <th className="px-4 py-4 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {usersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRowSkeleton key={i} cols={7} />
                    ))
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user, index) => {
                      const role = (user.role || '').toLowerCase();
                      const isAdmin = role === 'admin';
                      const resStatus = (user.researcherStatus || '').toLowerCase();
                      const isResearcherPending = !isAdmin && role === 'researcher' && (resStatus === 'pending' || resStatus === '');
                      const tags = getExpertiseTags(user);
                      return (
                        <tr key={user._id} className={`${isAdmin ? 'shadow-[0_2px_8px_rgba(120,53,15,0.12)]' : 'shadow-sm hover:shadow-md'} transition-all`}>
                          <td className={`px-4 py-4 border-y border-l border-slate-200 first:rounded-l-xl ${isAdmin ? 'bg-amber-50/60' : 'bg-white'}`}>
                            <span className="inline-flex items-center justify-center min-w-[62px] px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold">
                              {getUserCode(user, index)}
                            </span>
                          </td>
                          <td className={`px-4 py-4 text-sm text-gray-900 border-y border-slate-200 ${isAdmin ? 'bg-amber-50/60' : 'bg-white'}`}>
                            <p className="font-semibold text-slate-800 leading-tight">{user.name || 'Unknown User'}</p>
                            <p className="text-slate-500 text-sm mt-1">{user.email || '—'}</p>
                          </td>
                          <td className={`px-4 py-4 border-y border-slate-200 ${isAdmin ? 'bg-amber-50/60' : 'bg-white'}`}>
                            <div className="flex flex-wrap gap-1.5">
                              {tags.map((tag) => (
                                <span
                                  key={`${user._id}-${tag}`}
                                  className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className={`px-4 py-4 border-y border-slate-200 ${isAdmin ? 'bg-amber-50/60' : 'bg-white'}`}>
                            <div className="flex items-center gap-2">
                              <Badge role={role}>{user.role || '—'}</Badge>
                              {isAdmin && <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pinned</span>}
                            </div>
                          </td>
                          <td className={`px-4 py-4 text-sm text-slate-600 border-y border-slate-200 ${isAdmin ? 'bg-amber-50/60' : 'bg-white'}`}>
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className={`px-4 py-4 text-sm font-semibold text-slate-800 border-y border-slate-200 ${isAdmin ? 'bg-amber-50/60' : 'bg-white'}`}>{getUserRep(user)}</td>
                          <td className={`px-4 py-4 text-right border-y border-r border-slate-200 last:rounded-r-xl ${isAdmin ? 'bg-amber-50/60' : 'bg-white'}`}>
                            <div className="flex justify-end items-center gap-2 flex-wrap">
                              {isAdmin ? (
                                <span className="text-xs text-gray-500">Protected account</span>
                              ) : null}
                              {isResearcherPending && (
                                <>
                                  <Button size="sm" variant="success" onClick={() => handleApproveUser(user._id)}>Approve</Button>
                                  <Button size="sm" variant="danger" className="px-2 py-1 text-xs rounded-md bg-red-700 hover:bg-red-800" onClick={() => handleRejectUser(user._id)} title="Reject user">
                                    <X size={13} />
                                  </Button>
                                </>
                              )}
                              {isAdmin ? null : String(user._id) === String(currentUserId) ? (
                                <span className="text-xs text-gray-400">(you)</span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  className="px-2 py-1 text-xs rounded-md bg-red-700 hover:bg-red-800"
                                  onClick={() => setDeleteUserModal(user)}
                                  title="Ban user"
                                >
                                  <Ban size={13} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12">
                        <EmptyState title="No users found" description="Try changing the role filter." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeTab === TAB_EXPERIMENTS && (
        <>
          <p className="text-sm text-gray-600 mb-4">
            You can delete an experiment (e.g. for policy violations). Optionally reject the researcher and/or reassign them to participant.
          </p>
          <Card padding={false} className="overflow-hidden border border-slate-200 bg-[#F8FAFC]">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="bg-slate-100/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Researcher</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[#F8FAFC] divide-y divide-slate-200">
                  {experimentsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRowSkeleton key={i} cols={4} />
                    ))
                  ) : experiments.length > 0 ? (
                    experiments.map((exp) => (
                      <tr key={exp._id} className="hover:bg-white/80 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{exp.title || exp.name || 'Untitled'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{exp.researcherName || 'Unknown researcher'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {exp.createdAt ? new Date(exp.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDeleteModal({ experiment: exp, rejectResearcher: false, reassignToParticipant: false })}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-12">
                        <EmptyState title="No experiments found" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeTab === TAB_FUND_REQUESTS && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                <label htmlFor="fund-request-status-filter" className="text-sm font-medium text-gray-700">
                  Status:
                </label>
                <select
                  id="fund-request-status-filter"
                  value={fundRequestStatusFilter}
                  onChange={(e) => setFundRequestStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent min-w-[160px]"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
          <Card padding={false} className="overflow-hidden border border-slate-200 bg-[#F8FAFC]">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="bg-slate-100/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Experiment</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Researcher</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount (requested)</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Requested At</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[#F8FAFC] divide-y divide-slate-200">
                  {fundRequestsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRowSkeleton key={i} cols={6} />
                    ))
                  ) : fundRequests.length > 0 ? (
                    fundRequests.map((req) => (
                      <tr key={req._id} className="hover:bg-white/80 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{req.experimentTitle || 'Unknown Experiment'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{req.researcherName || 'Unknown researcher'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">${req.amountRequested?.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <Badge status={getStatusVariant(req.status)}>{req.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setUpdateFundRequestModal(req)}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-12">
                        <EmptyState title="No fund requests found" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeTab === TAB_REPORTS && (
        <AdminReports />
      )}

      {/* Fund Request update modal */}
      <Modal
        open={!!updateFundRequestModal}
        onClose={() => { setUpdateFundRequestModal(null); setFundRequestDecisionNote(''); setApprovedAmount(''); }}
        title="Review Fund Request"
        size="md"
      >
        {updateFundRequestModal && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Experiment</p>
              <p className="text-sm text-gray-900 mt-0.5">{updateFundRequestModal.experimentTitle}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Researcher</p>
              <p className="text-sm text-gray-900 mt-0.5">{updateFundRequestModal.researcherName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Requested Amount</p>
              <p className="text-sm text-gray-900 mt-0.5">${updateFundRequestModal.amountRequested?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</p>
              <p className="text-sm text-gray-900 mt-0.5">{updateFundRequestModal.reason}</p>
            </div>

            <hr className="border-slate-100" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Decision Note</label>
              <Textarea
                rows={3}
                placeholder="Notes for your decision..."
                value={fundRequestDecisionNote}
                onChange={(e) => setFundRequestDecisionNote(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approved Amount ($)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter approved amount"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => { setUpdateFundRequestModal(null); setFundRequestDecisionNote(''); setApprovedAmount(''); }}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleUpdateFundRequestStatus(updateFundRequestModal._id, 'rejected', fundRequestDecisionNote)}
              >
                Reject
              </Button>
              <Button
                variant="success"
                disabled={!approvedAmount}
                onClick={() => handleUpdateFundRequestStatus(updateFundRequestModal._id, 'approved', fundRequestDecisionNote, approvedAmount)}
              >
                Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Researcher detail modal */}
      <Modal
        open={!!detailModalResearcher}
        onClose={() => { setDetailModalResearcher(null); setDetailReviewNotes(''); }}
        title={<span className="text-indigo-700">Researcher details</span>}
        size="lg"
      >
        {detailModalResearcher && (
          <div className="space-y-4">
            {detailModalResearcher.isFlagged && detailModalResearcher.flags?.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-red-800 font-semibold text-sm">Flagged Researcher</h3>
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {detailModalResearcher.flags.map((flag, idx) => (
                    <li key={idx} className="text-sm text-red-700">
                      <span className="font-medium text-red-900">{flag.reason}</span>
                      <span className="text-xs text-red-500 ml-2">({new Date(flag.createdAt).toLocaleDateString()})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['Name', detailModalResearcher.fullName || (detailModalResearcher.user && detailModalResearcher.user.name) || '—'],
                ['Email', detailModalResearcher.user?.email || '—'],
                ['NIC', detailModalResearcher.nic || '—'],
                ['Gender', detailModalResearcher.gender || '—'],
                ['Current workplace', detailModalResearcher.currentWorkplace || '—'],
                ['Highest qualification', detailModalResearcher.highestAcademicQualification || '—'],
                ['Researcher type', detailModalResearcher.researcherType || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                  <p className="text-sm text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            {detailModalResearcher.researcherType === 'Other' && detailModalResearcher.otherResearcherTypeExplanation && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Other (explanation)</p>
                <p className="text-sm text-gray-900 mt-0.5">{detailModalResearcher.otherResearcherTypeExplanation}</p>
              </div>
            )}
            {detailModalResearcher.researcherType === 'Affiliated to Organization' && detailModalResearcher.affiliationProof && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Affiliation Proof</p>
                <a
                  href={getAffiliationProofUrl(detailModalResearcher.affiliationProof)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-800 mt-0.5 hover:underline block truncate"
                  title="View attached document or image"
                >
                  View Document / Image
                </a>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Published research</p>
              <p className="text-sm text-gray-900 mt-0.5">{detailModalResearcher.hasPublishedResearch ? 'Yes' : 'No'}</p>
            </div>
            {detailModalResearcher.hasPublishedResearch && detailModalResearcher.publicationSiteOrLink && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Publication site / link</p>
                <a
                  href={detailModalResearcher.publicationSiteOrLink.includes('://') ? detailModalResearcher.publicationSiteOrLink : `https://${detailModalResearcher.publicationSiteOrLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-800 mt-0.5 hover:underline block truncate"
                  title={detailModalResearcher.publicationSiteOrLink}
                >
                  {detailModalResearcher.publicationSiteOrLink}
                </a>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Purpose</p>
              <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{detailModalResearcher.purpose || '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status:</span>
              <Badge status={getStatusVariant(detailModalResearcher.status)}>{detailModalResearcher.status || 'pending'}</Badge>
            </div>
            {detailModalResearcher.reviewNotes && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Review notes</p>
                <p className="text-sm text-gray-900 mt-0.5">{detailModalResearcher.reviewNotes}</p>
              </div>
            )}
            {detailModalResearcher.reviewedAt && (
              <p className="text-xs text-gray-500">Reviewed at {new Date(detailModalResearcher.reviewedAt).toLocaleString()}</p>
            )}
            {(() => {
              const s = (detailModalResearcher.status || '').toLowerCase();
              const isPending = s === 'pending' || s === '';
              return isPending ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">Review notes (optional)</label>
                  <Textarea
                    rows={3}
                    placeholder="Add notes for your decision..."
                    value={detailReviewNotes}
                    onChange={(e) => setDetailReviewNotes(e.target.value)}
                  />
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                    <Button variant="danger" onClick={() => {
                      setDetailModalResearcher(null);
                      setDeleteResearcherModal(detailModalResearcher);
                    }}>
                      Delete Researcher
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => { setDetailModalResearcher(null); setDetailReviewNotes(''); }}>
                        Close
                      </Button>
                      <Button variant="success" onClick={() => handleApproveResearcher(detailModalResearcher._id, detailReviewNotes)}>
                        Approve
                      </Button>
                      <Button variant="danger" onClick={() => handleRejectResearcher(detailModalResearcher._id, detailReviewNotes)}>
                        Reject
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                  <Button variant="danger" onClick={() => {
                    setDetailModalResearcher(null);
                    setDeleteResearcherModal(detailModalResearcher);
                  }}>
                    Delete Researcher
                  </Button>
                  <Button variant="secondary" onClick={() => { setDetailModalResearcher(null); setDetailReviewNotes(''); }}>
                    Close
                  </Button>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Quick review modal */}
      <Modal
        open={!!reviewModal}
        onClose={() => { setReviewModal(null); setReviewNotes(''); }}
        title={reviewModal?.type === 'approve' ? 'Approve researcher' : 'Reject researcher'}
        size="md"
      >
        {reviewModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {reviewModal.researcher.fullName || (reviewModal.researcher.user && reviewModal.researcher.user.name)} –{' '}
              {reviewModal.researcher.user?.email}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review notes (optional)</label>
              <Textarea
                rows={3}
                placeholder="Add notes for your decision..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setReviewModal(null); setReviewNotes(''); }}>
                Cancel
              </Button>
              {reviewModal.type === 'approve' ? (
                <Button variant="success" onClick={() => handleApproveResearcher(reviewModal.researcher._id, reviewNotes)}>
                  Approve
                </Button>
              ) : (
                <Button variant="danger" onClick={() => handleRejectResearcher(reviewModal.researcher._id, reviewNotes)}>
                  Reject
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete experiment modal */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete experiment"
        size="md"
      >
        {deleteModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              &ldquo;{deleteModal.experiment.title || deleteModal.experiment.name || 'Untitled'}&rdquo; will be permanently deleted.
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!deleteModal.rejectResearcher}
                  onChange={(e) => setDeleteModal({ ...deleteModal, rejectResearcher: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Reject researcher (revoke researcher status)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!deleteModal.reassignToParticipant}
                  onChange={(e) => setDeleteModal({ ...deleteModal, reassignToParticipant: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Reassign creator to participant</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteExperiment}>Delete experiment</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete researcher modal */}
      <Modal
        open={!!deleteResearcherModal}
        onClose={() => setDeleteResearcherModal(null)}
        title="Remove researcher"
        size="md"
      >
        {deleteResearcherModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Remove <strong>{deleteResearcherModal.fullName || (deleteResearcherModal.user && deleteResearcherModal.user.name)}</strong> as a
              researcher? Their account will become an ordinary user (participant). The researcher record will be deleted.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteResearcherModal(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteResearcher}>Delete researcher</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete user modal */}
      <Modal
        open={!!deleteUserModal}
        onClose={() => setDeleteUserModal(null)}
        title="Delete user"
        size="md"
      >
        {deleteUserModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Permanently delete <strong>{deleteUserModal.name}</strong> ({deleteUserModal.email})? This will remove their account
              and, if they are a researcher, their researcher record. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteUserModal(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteUser}>Delete user</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDashboard;
