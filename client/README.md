# Leave Management System - Frontend

A modern, responsive React application for managing employee leave requests. Built with React 19, Tailwind CSS, and React Router.

## Features

- **User Authentication**: Login and registration system with protected routes
- **Employee Dashboard**: Submit requests, view history and statistics  
- **Manager Dashboard**: Review and approve/reject leave requests with real-time stats
- **Leave Request Management**: Comprehensive forms with validation
- **Leave History**: View, filter, and search all leave requests
- **Responsive Design**: Mobile-first design that works on all devices
- **Modern UI**: Clean, intuitive interface with smooth animations

## Pages

### Employee Pages
1. **Login** (`/login`) - User authentication
2. **Register** (`/register`) - New user registration  
3. **Employee Dashboard** (`/employee/dashboard`) - Overview and quick actions
4. **Submit Leave Request** (`/employee/submit-leave`) - Create new leave requests
5. **My Leave Requests** (`/employee/my-requests`) - View leave history

### Manager Pages  
1. **Manager Dashboard** (`/manager/dashboard`) - Statistics and pending approvals
2. **Pending Approvals** (`/manager/pending-approvals`) - Review requests
3. **Review Leave** (`/manager/review-leave/:id`) - Detailed leave review

## Technology Stack

- **React 19** - Modern React with hooks and functional components
- **React Router 7** - Client-side routing and navigation
- **Tailwind CSS 3** - Utility-first CSS framework
- **Vite** - Fast build tool and development server
- **Context API** - State management for authentication

## Prerequisites

- **Node.js 18+** 
- **npm** or **yarn**
- **Backend API** running (see server/README.md)

## Getting Started

### 1. Install Dependencies
```bash
cd client
npm install
```

### 2. Environment Configuration
Copy the environment template:
```bash
cp .env.example .env
```

Configure your `.env` file:
```env
# API Configuration - Point to your backend server
VITE_API_BASE_URL=http://localhost:8000

# For production deployment, use your deployed backend URL:
# VITE_API_BASE_URL=https://your-api-domain.herokuapp.com
```

### 3. Start Development Server
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```

The built files will be in the `dist/` directory.

## Environment Variables

### Development (.env)
```env
VITE_API_BASE_URL=http://localhost:8000
```

### Production (.env.production)  
```env
VITE_API_BASE_URL=https://your-backend-api.herokuapp.com
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

## Project Structure

```
client/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   │   └── Layout.jsx     # Main app layout
│   ├── contexts/         # React context providers
│   │   └── AuthContext.jsx
│   ├── pages/            # Page components
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Home.jsx
│   │   ├── Employee/     # Employee-specific pages
│   │   └── Manager/      # Manager-specific pages
│   ├── services/         # API service layer
│   │   ├── apiService.js  # Main API service
│   │   └── emailService.js
│   ├── styles/           # CSS files
│   ├── App.jsx          # Main app component
│   └── main.jsx         # App entry point
├── .env.example         # Environment template
├── package.json
├── tailwind.config.js   # Tailwind configuration
├── vite.config.js      # Vite configuration
└── README.md           # This file
```

## Deployment

### Netlify Deployment
1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy `dist/` folder to Netlify

3. Set environment variable in Netlify dashboard:
   - `VITE_API_BASE_URL` = your backend URL

### Vercel Deployment
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard

### Manual Deployment
1. Build the project:
   ```bash
   npm run build
   ```

2. Upload `dist/` folder contents to your web server

3. Configure your web server to:
   - Serve `index.html` for all routes (SPA routing)
   - Set proper CORS headers if needed

## Configuration

### API Service Configuration
The API service is configured in `src/services/apiService.js`:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
```

### Authentication Context
User authentication state is managed in `src/contexts/AuthContext.jsx` using:
- JWT tokens stored in localStorage
- Automatic token validation
- Role-based access control

## Troubleshooting

### Common Issues

**1. API Connection Error:**
```
API Request failed: fetch error
```
- Verify backend server is running
- Check `VITE_API_BASE_URL` in `.env`
- Ensure CORS is configured on backend

**2. Authentication Issues:**
```
401 Unauthorized
```
- Check if JWT token is valid and not expired
- Verify user credentials
- Clear localStorage and re-login

**3. Build Errors:**
```
Module not found
```
- Run `npm install` to ensure all dependencies are installed
- Check import paths in your code
- Verify Node.js version compatibility

**4. Routing Issues:**
```
404 Not Found on page refresh
```
- Configure your web server to serve `index.html` for all routes
- For Netlify, add `_redirects` file: `/* /index.html 200`

### Development Tips

1. **View Network Requests:**
   - Open browser DevTools → Network tab
   - Monitor API calls and responses

2. **Authentication Debugging:**
   - Check localStorage for JWT token
   - Verify token expiration in JWT debugger

3. **Hot Reload Issues:**
   ```bash
   # Clear Vite cache
   rm -rf node_modules/.vite
   npm run dev
   ```

## Default Users (Development)

After setting up the backend, create test users through the registration page:

**Manager Account:**
- Register with any email
- Manually set `is_manager: true` in MongoDB user document

**Employee Account:**
- Register normally (default role)

## License
MIT

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── Layout.jsx      # Main layout with navigation
├── contexts/           # React contexts
│   └── AuthContext.jsx # Authentication state management
├── pages/              # Page components
│   ├── Dashboard.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── SubmitLeaveRequest.jsx
│   └── MyLeaveRequests.jsx
├── App.jsx             # Main app component with routing
├── main.jsx            # Entry point
└── index.css           # Global styles and Tailwind imports
```

## Features in Detail

### Authentication System
- Mock authentication using localStorage
- Protected routes for authenticated users
- Automatic redirect to login for unauthenticated users

### Leave Request Types
- Annual Leave
- Sick Leave
- Personal Leave
- Maternity Leave
- Paternity Leave
- Bereavement Leave

### Form Validation
- Client-side validation for all forms
- Real-time error feedback
- Required field validation
- Date range validation

### Responsive Design
- Mobile-first approach
- Collapsible navigation menu
- Adaptive grid layouts
- Touch-friendly interface

## Customization

### Styling
The application uses Tailwind CSS for styling. You can customize:
- Color scheme in `tailwind.config.js`
- Custom CSS in `src/index.css`
- Component-specific styles inline

### Data
Currently uses mock data. To integrate with your backend:
1. Replace mock API calls in components
2. Update data structures to match your API
3. Implement proper error handling

### Authentication
The current authentication is mocked. To implement real authentication:
1. Replace mock login/register functions in `AuthContext.jsx`
2. Implement proper token management
3. Add refresh token logic
4. Implement proper logout and session expiry

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

### Code Style
- Functional components with hooks
- Consistent naming conventions
- Proper TypeScript-like prop validation
- Clean, readable code structure

### Performance
- Lazy loading for routes (can be implemented)
- Optimized re-renders with proper dependency arrays
- Efficient state management
- Minimal bundle size with Vite

## Contributing

1. Follow the existing code style
2. Add proper error handling
3. Test on multiple devices and browsers
4. Update documentation for new features

## License

This project is part of the Leave Management System.

## Support

For issues or questions, please refer to the main project documentation.
