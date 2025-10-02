import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import apiService from '../../services/apiService'

const Dashboard = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [myLeaves, setMyLeaves] = useState([])
  const [dashboardStats, setDashboardStats] = useState({
    totalLeaveDays: 0,
    usedLeaveDays: 0,
    remainingDays: 0,
    pendingRequests: 0
  })

  // Load user's leave requests on component mount
  useEffect(() => {
    loadMyLeaves()
  }, [])

  // Auto-refresh when page becomes visible (e.g., switching tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadMyLeaves()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Periodic auto-refresh every 30 seconds when page is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !loading) {
        loadMyLeaves()
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [loading])

  const loadMyLeaves = async () => {
    try {
      setLoading(true)
      console.log('🔄 Loading leave requests...')
      const leaves = await apiService.getMyLeaveRequests()
      console.log('📋 Received leaves data:', leaves)
      setMyLeaves(leaves)
      
      // Calculate dashboard statistics from the leave data
      calculateDashboardStats(leaves)
    } catch (error) {
      console.error('❌ Failed to load leave requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDashboardStats = (leaves) => {
    const currentYear = new Date().getFullYear()
    console.log('📊 Calculating dashboard stats for year:', currentYear)
    
    // Filter leaves for current year
    const currentYearLeaves = leaves.filter(leave => {
      const startDate = new Date(leave.start_date)
      return startDate.getFullYear() === currentYear
    })
    console.log('📅 Current year leaves:', currentYearLeaves)
    
    // Calculate used days (approved leaves)
    const approvedLeaves = currentYearLeaves.filter(leave => leave.status === 'approved')
    console.log('✅ Approved leaves:', approvedLeaves)
    
    const usedDays = approvedLeaves
      .reduce((total, leave) => {
        // If days field doesn't exist, calculate it from dates
        let days = leave.days;
        if (!days && leave.start_date && leave.end_date) {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        }
        return total + (days || 0);
      }, 0)
    console.log('📈 Used days calculated:', usedDays)
    
    // Count pending requests
    const pendingLeaves = currentYearLeaves.filter(leave => leave.status === 'pending')
    const pendingRequests = pendingLeaves.length
    console.log('⏳ Pending leaves:', pendingLeaves)
    console.log('📊 Pending count:', pendingRequests)
    
    // Assume 25 total leave days per year (this could come from user profile or company policy)
    const totalLeaveDays = 25
    const remainingDays = Math.max(0, totalLeaveDays - usedDays)
    
    const newStats = {
      totalLeaveDays,
      usedLeaveDays: usedDays,
      remainingDays,
      pendingRequests
    }
    console.log('📊 Final dashboard stats:', newStats)
    
    setDashboardStats(newStats)
  }

  // Calculate percentage changes for display
  const getChangePercentage = (current, previous) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%'
    const change = ((current - previous) / previous) * 100
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
  }

  // Mock data for dashboard - now using calculated values
  const stats = [
    { 
      name: 'Total Leave Days', 
      value: dashboardStats.totalLeaveDays.toString(), 
      change: '0%', 
      changeType: 'neutral' 
    },
    { 
      name: 'Used Leave Days', 
      value: dashboardStats.usedLeaveDays.toString(), 
      change: dashboardStats.usedLeaveDays > 0 ? `+${dashboardStats.usedLeaveDays}` : '0', 
      changeType: 'positive' 
    },
    { 
      name: 'Remaining Days', 
      value: dashboardStats.remainingDays.toString(), 
      change: `${dashboardStats.remainingDays}/${dashboardStats.totalLeaveDays}`, 
      changeType: dashboardStats.remainingDays > 10 ? 'positive' : 'negative' 
    },
    { 
      name: 'Pending Requests', 
      value: dashboardStats.pendingRequests.toString(), 
      change: dashboardStats.pendingRequests > 0 ? `${dashboardStats.pendingRequests} pending` : 'None', 
      changeType: dashboardStats.pendingRequests > 0 ? 'positive' : 'neutral' 
    },
  ]

  const getStatusBadge = (status) => {
    const statusStyles = {
      approved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
    }
    return `px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employee Dashboard</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Welcome back, {user?.full_name || user?.name || user?.username || 'Employee'}</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <button
              onClick={loadMyLeaves}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-50"
            >
              <svg className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link
              to="/employee/apply-leave"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Apply for Leave
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                {stat.change && (
                  <p className={`text-sm ${
                    stat.changeType === 'positive' ? 'text-green-600' : 
                    stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {stat.change}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link
          to="/employee/apply-leave"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition-shadow duration-200 border-l-4 border-indigo-500"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Apply for Leave</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Submit a new leave request for approval</p>
            </div>
            <div className="ml-auto">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        <Link
          to="/employee/my-requests"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition-shadow duration-200 border-l-4 border-green-500"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">View All Requests</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">See detailed view of all your leave requests</p>
            </div>
            <div className="ml-auto">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Content - Recent Leave Requests */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Leave Requests</h3>
            <Link
              to="/employee/my-requests"
              className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
            >
              View all →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-8 text-center">
              <div className="spinner mx-auto h-8 w-8"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Loading your leave requests...</p>
            </div>
          ) : myLeaves.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">No leave requests found</p>
              <Link
                to="/employee/apply-leave"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Submit your first leave request
              </Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {myLeaves.slice(0, 5).map((leave) => (
                  <tr key={leave._id || leave.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {leave.leave_type?.charAt(0).toUpperCase() + leave.leave_type?.slice(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {leave.start_date} to {leave.end_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(leave.status)}>
                        {leave.status?.charAt(0).toUpperCase() + leave.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {leave.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
