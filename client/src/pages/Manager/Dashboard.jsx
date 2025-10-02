import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import apiService from '../../services/apiService'

const ManagerDashboard = () => {
  const { user } = useAuth()
  const { showSuccess, showError, showWarning, showInfo } = useToast()
  const [activeTab, setActiveTab] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [comments, setComments] = useState('')
  const [actionType, setActionType] = useState('')
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [processedLeaves, setProcessedLeaves] = useState([])
  const [dashboardStats, setDashboardStats] = useState({
    pendingCount: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    teamMembers: 0
  })

  // Load data on component mount
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load pending leaves
      const pending = await apiService.getPendingApprovals()
      setPendingLeaves(pending)
      
      // Load processed leaves
      const processed = await apiService.getProcessedApprovals()
      setProcessedLeaves(processed)
      
      // Calculate stats from processed leaves
      const approvedThisMonth = processed.filter(leave => 
        leave.status === 'approved' && 
        new Date(leave.action_timestamp).getMonth() === new Date().getMonth()
      ).length
      
      const rejectedThisMonth = processed.filter(leave => 
        leave.status === 'rejected' && 
        new Date(leave.action_timestamp).getMonth() === new Date().getMonth()
      ).length
      
      setDashboardStats({
        pendingCount: pending.length,
        approvedThisMonth: approvedThisMonth,
        rejectedThisMonth: rejectedThisMonth,
        teamMembers: 0 // Would need backend endpoint to calculate
      })
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPendingLeaves = async () => {
    try {
      setLoading(true)
      const leaves = await apiService.getPendingApprovals()
      setPendingLeaves(leaves)
    } catch (error) {
      console.error('Failed to load pending leaves:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProcessedLeaves = async () => {
    try {
      setLoading(true)
      const leaves = await apiService.getProcessedApprovals()
      setProcessedLeaves(leaves)
    } catch (error) {
      console.error('Failed to load processed leaves:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    { name: 'Pending Requests', value: dashboardStats.pendingCount.toString() },
    { name: 'Approved This Month', value: dashboardStats.approvedThisMonth.toString() },
    { name: 'Rejected This Month', value: dashboardStats.rejectedThisMonth.toString() },
    { name: 'Team Members', value: dashboardStats.teamMembers.toString() }
  ]

  const handleApproveReject = (leave, action) => {
    setSelectedLeave(leave)
    setActionType(action)
    setShowCommentsModal(true)
  }

  const handleActionSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      const actionData = {
        comments: comments
      }
      
      let response
      if (actionType === 'approve') {
        response = await apiService.approveLeave(selectedLeave._id, actionData)
      } else {
        response = await apiService.rejectLeave(selectedLeave._id, actionData)
      }
      
      showSuccess(`Leave request ${actionType}ed successfully!`)
      
      // Reset modal
      setShowCommentsModal(false)
      setSelectedLeave(null)
      setComments('')
      setActionType('')
      
      // Reload pending leaves to reflect the change
      await loadDashboardData()
      
    } catch (error) {
      console.error(`Failed to ${actionType} leave:`, error)
      showError(`Failed to ${actionType} leave: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusStyles = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return `px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage team leave requests and approvals</p>
        <div className="mt-4 bg-blue-50 p-4 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>AMP Email Approvals:</strong> You can also approve leaves directly from your email inbox! 
            This dashboard is a secondary option for testing the backend.
          </p>
        </div>
        
        {/* Toast Demo - Remove this in production
        <div className="mt-4 bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Toast Notifications:</strong> Professional notifications now replace all alert messages.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => showSuccess('Test success message!')}
              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              Success
            </button>
            <button
              onClick={() => showError('Test error message!')}
              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
            >
              Error
            </button>
            <button
              onClick={() => showWarning('Test warning message!')}
              className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
            >
              Warning
            </button>
            <button
              onClick={() => showInfo('Test info message!')}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Info
            </button>
          </div>
        </div> */}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('pending')
              loadPendingLeaves()
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Requests ({pendingLeaves.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('processed')
              loadProcessedLeaves()
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'processed'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Processed Requests ({processedLeaves.length})
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'pending' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Pending Leave Requests</h3>
            <p className="text-sm text-gray-600">Requests awaiting your approval</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingLeaves.map((leave) => (
                  <tr key={leave.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{leave.employee_name}</div>
                        <div className="text-sm text-gray-500">{leave.employee_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {leave.start_date} to {leave.end_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {leave.days}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {leave.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleApproveReject(leave, 'approve')}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveReject(leave, 'reject')}
                        className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'processed' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Processed Leave Requests</h3>
            <p className="text-sm text-gray-600">Previously approved/rejected requests</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processed Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processedLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium text-gray-900 mb-2">No processed requests</p>
                        <p className="text-sm text-gray-500">Processed leave requests will appear here once you approve or reject them.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  processedLeaves.map((leave) => (
                    <tr key={leave.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{leave.employee_name}</div>
                          <div className="text-sm text-gray-500">{leave.employee_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {leave.start_date} to {leave.end_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(leave.status)}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {leave.comments || 'No comments'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {leave.action_timestamp ? new Date(leave.action_timestamp).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showCommentsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Confirm {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Employee: {selectedLeave?.employee_name}<br />
              Leave: {selectedLeave?.leave_type} ({selectedLeave?.start_date} to {selectedLeave?.end_date})
            </p>
            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (optional):
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={`Add comments for this ${actionType}...`}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCommentsModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-md ${
                    actionType === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerDashboard
