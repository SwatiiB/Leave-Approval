# Frontend Setup for Hosted Backend

## 🚀 Quick Start

Your frontend is now configured to work with your hosted Heroku backend!

### **1. Update Backend URL**

Replace `your-app-name` with your actual Heroku app name in:
- `.env` 
- `.env.production`

```bash
# Example:
VITE_API_BASE_URL=https://my-leave-api.herokuapp.com
```

### **2. Run with Hosted Backend**

```bash
# Start frontend (connects to Heroku backend)
npm run dev

# Or explicitly use production mode
npm run dev:production
```

### **3. Environment Switching**

- **Local Backend:** `npm run dev:local` (uses localhost:8000)
- **Hosted Backend:** `npm run dev` or `npm run dev:production` (uses Heroku URL)

## 🔧 Configuration Files

- `.env` - Default configuration (currently set to Heroku)
- `.env.local` - Local development with local backend
- `.env.production` - Production configuration with Heroku backend

## 🌐 API Endpoints

Your frontend will now call:
- **Authentication:** `https://your-app.herokuapp.com/auth/*`
- **Leave Requests:** `https://your-app.herokuapp.com/leave/*`
- **User Data:** `https://your-app.herokuapp.com/auth/me`

## ✅ Verification

1. Start frontend: `npm run dev`
2. Open browser: `http://localhost:5173`
3. Check browser console - API calls should go to your Heroku URL
4. Try login/registration to test connectivity

## 🔒 CORS Configuration

Your backend is already configured to allow requests from `localhost:5173`, so no additional CORS changes needed!

## 📧 Email Integration

- **Approval emails** will submit to your Heroku backend (HTTPS ✅)
- **Rejection links** will redirect to your local frontend (HTTP ✅)
- **Manager dashboard** will call Heroku API for data

Perfect setup for development with production email functionality! 🎉
