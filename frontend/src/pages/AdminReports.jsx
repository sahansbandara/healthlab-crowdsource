import React, { useState, useEffect } from 'react';
import { Flag, ChevronDown, Ban, Trash2, Eye } from 'lucide-react';
import {
  getAllReports,
  getPostReportDetails,
  banUserForReport,
  deleteReportedPost,
} from '../api/posts';
import { Button, Card, Badge, Modal, ErrorMessage, EmptyState } from '../components/ui';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');

  useEffect(() => {
    fetchReports();
  }, [filterStatus]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await getAllReports({ status: filterStatus });
      setReports(data.reports || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (postId) => {
    try {
      setDetailsLoading(true);
      setError('');
      const { data } = await getPostReportDetails(postId);
      setDetails(data.details);
      setSelectedReport(postId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleBanUser = async (postId) => {
    if (!window.confirm('Are you sure you want to ban this user?')) return;
    try {
      setActionLoading(true);
      await banUserForReport(postId);
      alert('User banned successfully');
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to ban user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      setActionLoading(true);
      await deleteReportedPost(postId);
      alert('Post deleted successfully');
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete post');
    } finally {
      setActionLoading(false);
    }
  };

  const reasonLabels = {
    spam: 'Spam',
    inappropriate: 'Inappropriate',
    offensive: 'Offensive/Abusive',
    misinformation: 'Misinformation',
    other: 'Other',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Flag className="text-red-600" size={32} />
          Reported Posts
        </h1>
        <p className="text-gray-600">Review and manage reported posts from the community</p>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} className="mb-4" />}

      {/* Status Filter */}
      <div className="mb-6 flex gap-2">
        {['pending', 'reviewed', 'resolved'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">Loading reports...</div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon="✓"
          title={`No ${filterStatus} reports`}
          description={`All posts are clear in the ${filterStatus} status`}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Post</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Author</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Flagged By</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Reports</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.postId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <p className="font-medium text-gray-900 truncate">{report.postTitle}</p>
                      <p className="text-xs text-gray-500 mt-1">{report.postId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{report.authorName}</p>
                      <p className="text-xs text-gray-500">{report.authorEmail}</p>
                      <p className="text-xs text-gray-500">UID: {report.authorId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="secondary">{report.reportCount} users</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(report.reasons).length > 0 ? (
                        Object.entries(
                          report.reasons.reduce((acc, reason) => {
                            acc[reason] = (acc[reason] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([reason, count]) => (
                          <Badge key={reason} variant="outline" className="text-xs">
                            {reasonLabels[reason]} ({count})
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewDetails(report.postId)}
                      disabled={detailsLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {selectedReport && details && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1200] p-4 overflow-auto">
          <div className="bg-white rounded-3xl overflow-hidden shadow-xl max-w-3xl w-full my-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">Report Details</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Post Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Post</h3>
                <Card className="rounded-2xl">
                  <p className="font-medium text-gray-900 mb-2">{details.postTitle}</p>
                  <p className="text-sm text-gray-600 line-clamp-4">{details.postContent}</p>
                </Card>
              </div>

              {/* Author Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Author</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
                    <p className="text-sm font-medium text-gray-900">{details.authorName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                    <p className="text-sm font-medium text-gray-900">{details.authorEmail}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">User ID</p>
                    <p className="text-sm font-medium text-gray-900 break-all">{details.authorId}</p>
                  </div>
                </div>
              </div>

              {/* Report Summary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Report Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 p-4 rounded-xl">
                    <p className="text-xs text-red-600 uppercase tracking-wide font-semibold">Total Reports</p>
                    <p className="text-2xl font-bold text-red-700">{details.totalReports}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Reasons</p>
                    <p className="text-2xl font-bold text-blue-700">{Object.keys(details.reasonCounts).length}</p>
                  </div>
                </div>
              </div>

              {/* Reason Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Reason Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(details.reasonCounts).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-900">{reasonLabels[reason]}</span>
                      <Badge variant="secondary">{count} reports</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Reports */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">All Reports</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {details.reports.map((report, idx) => (
                    <div key={idx} className="p-3 border border-gray-200 rounded-xl">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{report.reportedBy?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{report.reportedBy?.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(report.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline">{reasonLabels[report.reason]}</Badge>
                      </div>
                      {report.customReason && (
                        <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                          {report.customReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons - Fixed at bottom */}
            <div className="border-t border-gray-200 bg-white p-6 flex gap-3">
              <button
                onClick={() => setSelectedReport(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleBanUser(selectedReport)}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                <Ban size={16} />
                Ban User
              </button>
              <button
                onClick={() => handleDeletePost(selectedReport)}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                Delete Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
