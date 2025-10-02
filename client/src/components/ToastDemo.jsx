import React from 'react'
import { useToast } from '../contexts/ToastContext'

const ToastDemo = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast()

  const handleSuccess = () => {
    showSuccess('Operation completed successfully!')
  }

  const handleError = () => {
    showError('Something went wrong. Please try again.')
  }

  const handleWarning = () => {
    showWarning('Please review your input before proceeding.')
  }

  const handleInfo = () => {
    showInfo('Here is some helpful information for you.')
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Toast Notification Demo
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleSuccess}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Show Success Toast
        </button>
        <button
          onClick={handleError}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Show Error Toast
        </button>
        <button
          onClick={handleWarning}
          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          Show Warning Toast
        </button>
        <button
          onClick={handleInfo}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Show Info Toast
        </button>
      </div>
    </div>
  )
}

export default ToastDemo


