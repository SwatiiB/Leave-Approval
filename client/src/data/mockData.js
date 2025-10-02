// Mock data for the Leave Management System

export const mockUsers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@company.com',
    role: 'Software Engineer',
    department: 'Engineering',
    avatar: 'JD'
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    role: 'Product Manager',
    department: 'Product',
    avatar: 'JS'
  }
]

export const mockLeaveRequests = [
  {
    id: 1,
    userId: 1,
    type: 'Annual Leave',
    startDate: '2024-01-15',
    endDate: '2024-01-17',
    status: 'Approved',
    days: 3,
    reason: 'Family vacation to the beach. Planning to spend quality time with family and relax.',
    submittedDate: '2024-01-10',
    approvedBy: 'Sarah Manager',
    approvedDate: '2024-01-12',
    comments: 'Approved - Enjoy your vacation! Please ensure all pending tasks are completed before leaving.',
    emergencyContact: null,
    emergencyPhone: null
  },
  {
    id: 2,
    userId: 1,
    type: 'Sick Leave',
    startDate: '2024-01-10',
    endDate: '2024-01-10',
    status: 'Approved',
    days: 1,
    reason: 'Not feeling well, experiencing flu-like symptoms. Need rest to recover.',
    submittedDate: '2024-01-09',
    approvedBy: 'Sarah Manager',
    approvedDate: '2024-01-09',
    comments: 'Approved - Get well soon! Take care of yourself.',
    emergencyContact: 'Mary Doe',
    emergencyPhone: '+1-555-0123'
  },
  {
    id: 3,
    userId: 1,
    type: 'Personal Leave',
    startDate: '2024-01-25',
    endDate: '2024-01-26',
    status: 'Pending',
    days: 2,
    reason: 'Personal family matter that requires my immediate attention.',
    submittedDate: '2024-01-20',
    approvedBy: null,
    approvedDate: null,
    comments: null,
    emergencyContact: 'Mary Doe',
    emergencyPhone: '+1-555-0123'
  },
  {
    id: 4,
    userId: 1,
    type: 'Maternity Leave',
    startDate: '2024-03-01',
    endDate: '2024-06-01',
    status: 'Approved',
    days: 92,
    reason: 'Maternity leave for new baby. Need time to care for newborn and recover.',
    submittedDate: '2024-02-15',
    approvedBy: 'HR Manager',
    approvedDate: '2024-02-20',
    comments: 'Approved - Congratulations on your new arrival! Wishing you and your family all the best.',
    emergencyContact: 'Dr. Johnson',
    emergencyPhone: '+1-555-0456'
  },
  {
    id: 5,
    userId: 1,
    type: 'Annual Leave',
    startDate: '2024-02-15',
    endDate: '2024-02-16',
    status: 'Rejected',
    days: 2,
    reason: 'Weekend getaway with friends to celebrate birthday.',
    submittedDate: '2024-02-10',
    approvedBy: 'Sarah Manager',
    approvedDate: '2024-02-12',
    comments: 'Rejected - High workload period, please reschedule for a later date. We have important project deadlines.',
    emergencyContact: null,
    emergencyPhone: null
  },
  {
    id: 6,
    userId: 1,
    type: 'Bereavement Leave',
    startDate: '2024-02-20',
    endDate: '2024-02-22',
    status: 'Approved',
    days: 3,
    reason: 'Family bereavement. Need time to attend funeral and support family.',
    submittedDate: '2024-02-18',
    approvedBy: 'Sarah Manager',
    approvedDate: '2024-02-19',
    comments: 'Approved - Our condolences. Take the time you need.',
    emergencyContact: 'Mary Doe',
    emergencyPhone: '+1-555-0123'
  }
]

export const mockCompanyHolidays = [
  {
    id: 1,
    name: 'New Year\'s Day',
    date: '2024-01-01',
    type: 'Public Holiday',
    description: 'Celebration of the new year'
  },
  {
    id: 2,
    name: 'Martin Luther King Jr. Day',
    date: '2024-01-15',
    type: 'Public Holiday',
    description: 'Honoring civil rights leader'
  },
  {
    id: 3,
    name: 'Presidents\' Day',
    date: '2024-02-19',
    type: 'Public Holiday',
    description: 'Honoring US presidents'
  },
  {
    id: 4,
    name: 'Memorial Day',
    date: '2024-05-27',
    type: 'Public Holiday',
    description: 'Honoring fallen soldiers'
  },
  {
    id: 5,
    name: 'Independence Day',
    date: '2024-07-04',
    type: 'Public Holiday',
    description: 'US Independence Day'
  },
  {
    id: 6,
    name: 'Labor Day',
    date: '2024-09-02',
    type: 'Public Holiday',
    description: 'Honoring workers'
  },
  {
    id: 7,
    name: 'Columbus Day',
    date: '2024-10-14',
    type: 'Public Holiday',
    description: 'Columbus Day observance'
  },
  {
    id: 8,
    name: 'Veterans Day',
    date: '2024-11-11',
    type: 'Public Holiday',
    description: 'Honoring veterans'
  },
  {
    id: 9,
    name: 'Thanksgiving Day',
    date: '2024-11-28',
    type: 'Public Holiday',
    description: 'Thanksgiving celebration'
  },
  {
    id: 10,
    name: 'Christmas Day',
    date: '2024-12-25',
    type: 'Public Holiday',
    description: 'Christmas celebration'
  }
]

export const mockLeaveTypes = [
  {
    value: 'annual',
    label: 'Annual Leave',
    description: 'Vacation and personal time off',
    color: 'blue',
    maxDays: 25,
    requiresApproval: true
  },
  {
    value: 'sick',
    label: 'Sick Leave',
    description: 'Medical and health-related time off',
    color: 'red',
    maxDays: 15,
    requiresApproval: false
  },
  {
    value: 'personal',
    label: 'Personal Leave',
    description: 'Personal or family matters',
    color: 'purple',
    maxDays: 10,
    requiresApproval: true
  },
  {
    value: 'maternity',
    label: 'Maternity Leave',
    description: 'Pregnancy and childbirth',
    color: 'pink',
    maxDays: 90,
    requiresApproval: true
  },
  {
    value: 'paternity',
    label: 'Paternity Leave',
    description: 'Father\'s time off for new child',
    color: 'indigo',
    maxDays: 30,
    requiresApproval: true
  },
  {
    value: 'bereavement',
    label: 'Bereavement Leave',
    description: 'Time off for family loss',
    color: 'gray',
    maxDays: 5,
    requiresApproval: false
  }
]

export const mockDepartments = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Operations',
  'Legal',
  'Customer Support'
]

export const mockRoles = [
  'Software Engineer',
  'Product Manager',
  'Designer',
  'Marketing Specialist',
  'Sales Representative',
  'HR Manager',
  'Financial Analyst',
  'Operations Manager',
  'Legal Counsel',
  'Customer Support Specialist'
]
