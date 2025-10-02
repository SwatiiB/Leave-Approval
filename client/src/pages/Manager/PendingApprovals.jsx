import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';

const PendingApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [reviewText, setReviewText] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch pending leave requests on component mount
  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getPendingApprovals();
      console.log('Fetched pending approvals data:', data);
      console.log('Data length:', data?.length);
      if (data?.length > 0) {
        console.log('First item status:', data[0].status);
        console.log('All statuses:', data.map(item => item.status));
      }
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
      setError('Failed to load pending approvals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await apiService.approveLeave(id, { 
        comments: reviewText[id] || '' 
      });
      
      // Update local state to reflect the change
      setRequests((prev) =>
        prev.map((req) =>
          req.id === id ? { ...req, status: 'Approved' } : req
        )
      );
      
      // Clear the review text for this request
      setReviewText((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } catch (err) {
      console.error('Error approving leave:', err);
      setError('Failed to approve leave request. Please try again.');
    }
  };

  const handleReject = async (id) => {
    try {
      await apiService.rejectLeave(id, { 
        comments: reviewText[id] || '' 
      });
      
      // Update local state to reflect the change
      setRequests((prev) =>
        prev.map((req) =>
          req.id === id ? { ...req, status: 'Rejected', review: reviewText[id] || '' } : req
        )
      );
      
      // Clear the review text for this request
      setReviewText((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } catch (err) {
      console.error('Error rejecting leave:', err);
      setError('Failed to reject leave request. Please try again.');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-4">
      <h3 className="text-lg font-semibold mb-4">Pending Leave Approvals</h3>
      
      {/* Debug info - remove this after fixing */}
      {!loading && requests.length > 0 && (
        <div className="bg-gray-100 p-2 mb-4 text-xs">
          <strong>Debug:</strong> Total requests: {requests.length}, 
          Pending count: {requests.filter((r) => r.status?.toLowerCase() === 'pending').length},
          Statuses: {requests.map(r => r.status).join(', ')}
        </div>
      )}
      
      {!loading && requests.length === 0 && (
        <div className="bg-yellow-100 p-2 mb-4 text-xs">
          <strong>Note:</strong> This page will show new requests when they arrive.
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button 
            onClick={fetchPendingApprovals}
            className="ml-2 text-sm underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading pending approvals...</p>
        </div>
      ) : requests.filter((r) => r.status?.toLowerCase() === 'pending').length === 0 ? (
        <p className="text-gray-500">No pending requests.</p>
      ) : (
        <div className="space-y-4">
          {requests.filter((r) => r.status?.toLowerCase() === 'pending').map((req) => (
            <div key={req.id} className="border p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="font-medium">{req.employee_name || req.employee}</span> - {req.leave_type || req.type}
                  <div className="text-sm text-gray-500">{req.start_date || req.startDate} to {req.end_date || req.endDate}</div>
                  <div className="text-sm text-gray-500">Reason: {req.reason}</div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApprove(req.id)} 
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleReject(req.id)} 
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
              <textarea
                className="w-full border rounded p-2 mt-2"
                placeholder="Optional: Comments for approval/rejection"
                value={reviewText[req.id] || ''}
                onChange={e => setReviewText({ ...reviewText, [req.id]: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;
