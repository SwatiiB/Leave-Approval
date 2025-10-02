import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { mockLeaveTypes } from '../../data/mockData'
import { useToast } from '../../contexts/ToastContext'
import apiService from '../../services/apiService'

const SubmitLeaveRequest = () => {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    managerEmail: '',
    emergencyContact: '',
    emergencyPhone: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const leaveTypes = mockLeaveTypes

  // Prevent selecting past dates
  const pad2 = (n) => String(n).padStart(2, '0')
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0
    
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays + 1 // Include both start and end dates
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.leaveType) {
      newErrors.leaveType = 'Please select a leave type'
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    } else {
      const startDate = new Date(formData.startDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (startDate < today) {
        newErrors.startDate = 'Start date cannot be in the past'
      }
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    } else if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      if (endDate < startDate) {
        newErrors.endDate = 'End date cannot be before start date'
      }
    }
    
    if (!formData.reason) {
      newErrors.reason = 'Please provide a reason for your leave request'
    } else if (formData.reason.length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters long'
    }
    
    if (!formData.managerEmail) {
      newErrors.managerEmail = 'Manager email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.managerEmail)) {
        newErrors.managerEmail = 'Please enter a valid email address'
      }
    }
    
    if (formData.leaveType === 'sick' || formData.leaveType === 'personal') {
      if (!formData.emergencyContact) {
        newErrors.emergencyContact = 'Emergency contact is required for this leave type'
      }
      if (!formData.emergencyPhone) {
        newErrors.emergencyPhone = 'Emergency phone number is required for this leave type'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    
    try {
      // Prepare the data for the API
      const leaveRequestData = {
        leave_type: formData.leaveType,
        start_date: formData.startDate,
        end_date: formData.endDate,
        reason: formData.reason,
        manager_email: formData.managerEmail
      }
      
      // Submit to the actual API
      await apiService.submitLeaveRequest(leaveRequestData)
      
      showSuccess('Leave request submitted successfully! Your manager will receive an email notification.')
      navigate('/employee/my-requests')
    } catch (error) {
      console.error('Submission error:', error)
      showError('Failed to submit leave request. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const days = calculateDays()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Submit Leave Request</h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Fill out the form below to request time off. All requests are subject to approval.
                </p>
              </div>
              <Link
                to="/employee"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
            </div>
          </div>

          {errors.general && (
            <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="text-sm text-red-700 dark:text-red-400">{errors.general}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Leave Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Leave Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leaveTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${
                      formData.leaveType === type.value
                        ? 'border-indigo-500 ring-2 ring-indigo-500'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="leaveType"
                      value={type.value}
                      checked={formData.leaveType === type.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className="flex flex-1">
                      <div className="flex flex-col">
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">{type.label}</span>
                        <span className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">{type.description}</span>
                      </div>
                    </div>
                    <div className={`ml-3 flex h-5 w-5 items-center justify-center ${
                      formData.leaveType === type.value ? 'text-indigo-600' : 'text-gray-300'
                    }`}>
                      {formData.leaveType === type.value && (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M9.707 3.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L5 6.586l3.293-3.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              {errors.leaveType && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.leaveType}</p>
              )}
            </div>

            {/* Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={todayStr}
                  className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 ${
                    errors.startDate ? 'border-red-300' : ''
                  }`}
                />
                {errors.startDate && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate || todayStr}
                  className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 ${
                    errors.endDate ? 'border-red-300' : ''
                  }`}
                />
                {errors.endDate && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Days Calculation */}
            {days > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Leave Duration: {days} day{days !== 1 ? 's' : ''}
                    </h3>
                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                      <p>This request covers {days} working day{days !== 1 ? 's' : ''}.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason for Leave <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={4}
                value={formData.reason}
                onChange={handleChange}
                placeholder="Please provide a detailed reason for your leave request..."
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.reason ? 'border-red-300' : ''
                }`}
              />
              {errors.reason && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.reason}</p>
              )}
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Please provide sufficient detail to help with the approval process.
              </p>
            </div>

            {/* Manager Email */}
            <div>
              <label htmlFor="managerEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Manager Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="managerEmail"
                name="managerEmail"
                value={formData.managerEmail}
                onChange={handleChange}
                placeholder="Enter your manager's email address"
                className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4 ${
                  errors.managerEmail ? 'border-red-300' : ''
                }`}
              />
              {errors.managerEmail && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.managerEmail}</p>
              )}
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Your manager will receive an email notification to approve or reject this request.
              </p>
            </div>

            {/* Emergency Contact (for certain leave types) */}
            {(formData.leaveType === 'sick' || formData.leaveType === 'personal') && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Emergency Contact Information</h3>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                    Please provide emergency contact details for this leave request.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Emergency Contact Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="emergencyContact"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleChange}
                      placeholder="Full name of emergency contact"
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                        errors.emergencyContact ? 'border-red-300' : ''
                      }`}
                    />
                    {errors.emergencyContact && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.emergencyContact}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="emergencyPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Emergency Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="emergencyPhone"
                      name="emergencyPhone"
                      value={formData.emergencyPhone}
                      onChange={handleChange}
                      placeholder="Phone number with country code"
                      className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                        errors.emergencyPhone ? 'border-red-300' : ''
                      }`}
                    />
                    {errors.emergencyPhone && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.emergencyPhone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Leave Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SubmitLeaveRequest
