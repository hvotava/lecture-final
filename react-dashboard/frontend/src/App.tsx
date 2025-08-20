import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Import unified theme CSS
import './ui/theme.css';

// Contexts
import { AuthProvider } from './contexts/AuthContext';

// Components
import ResponsiveSidebar from './components/ResponsiveSidebar';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserManagement from './pages/UserManagement';
import Companies from './pages/Companies';
import Trainings from './pages/Trainings';
import Lessons from './pages/Lessons';
import Tests from './pages/Tests';
import Analytics from './pages/Analytics';
import PlacementTest from './pages/PlacementTest';
import ContentManagement from './pages/ContentManagement';
import ProgressAnalytics from './pages/ProgressAnalytics';
import UserProgressAnalytics from './pages/UserProgressAnalytics';
import QuestionManager from './pages/QuestionManager';
import ReviewDashboard from './pages/ReviewDashboard';
import TestResults from './pages/TestResults';
import WebRTCDemo from './pages/WebRTCDemo';

// Enhanced responsive theme - keeping MUI theme for existing components
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb', // Matching new theme.css --primary
      light: '#3b82f6',
      dark: '#1d4ed8',
    },
    secondary: {
      main: '#0ea5e9', // Matching new theme.css --accent
      light: '#38bdf8',
      dark: '#0284c7',
    },
    background: {
      default: '#f8fafc', // Matching new theme.css --surface-50
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a', // Matching new theme.css --text-primary
      secondary: '#64748b', // Matching new theme.css --text-muted
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', // Matching new theme.css --font-family
    h1: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 700,
      color: '#0f172a',
    },
    h2: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 600,
      color: '#0f172a',
    },
    h3: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 600,
      color: '#0f172a',
    },
    h4: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 600,
      color: '#0f172a',
    },
    h5: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 500,
      color: '#0f172a',
    },
    h6: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 500,
      color: '#0f172a',
    },
  },
  shape: {
    borderRadius: 12, // Matching theme.css border radius
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', // Matching theme.css --shadow-sm
          border: '1px solid #E2E8F0',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontFamily: '"Lato", sans-serif',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#0D1B2A',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected routes with ResponsiveSidebar */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <ResponsiveSidebar>
                    <Dashboard />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/dashboard/users"
              element={
                <ProtectedRoute adminOnly>
                  <ResponsiveSidebar>
                    <Users />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/dashboard/user-management"
              element={
                <ProtectedRoute adminOnly>
                  <ResponsiveSidebar>
                    <UserManagement />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/dashboard/companies"
              element={
                <ProtectedRoute adminOnly>
                  <ResponsiveSidebar>
                    <Companies />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/dashboard/trainings"
              element={
                <ProtectedRoute>
                  <ResponsiveSidebar>
                    <Trainings />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/dashboard/lessons"
              element={
                <ProtectedRoute>
                  <ResponsiveSidebar>
                    <Lessons />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/dashboard/tests"
              element={
                <ProtectedRoute>
                  <ResponsiveSidebar>
                    <Tests />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/analytics"
              element={
                <ProtectedRoute adminOnly>
                  <ResponsiveSidebar>
                    <Analytics />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/placement-test"
              element={
                <ProtectedRoute>
                  <ResponsiveSidebar>
                    <PlacementTest />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/content-management"
              element={
                <ProtectedRoute adminOnly>
                  <ResponsiveSidebar>
                    <ContentManagement />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/progress-analytics"
              element={
                <ProtectedRoute adminOnly>
                  <ResponsiveSidebar>
                    <ProgressAnalytics />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />

            <Route
              path="/user-progress"
              element={
                <ProtectedRoute adminOnly>
                  <ResponsiveSidebar>
                    <UserProgressAnalytics />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />

            <Route
              path="/question-manager"
              element={
                <ProtectedRoute adminOnly>
                  <ResponsiveSidebar>
                    <QuestionManager />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/review-dashboard"
              element={
                <ProtectedRoute>
                  <ResponsiveSidebar>
                    <ReviewDashboard />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/test-results"
              element={
                <ProtectedRoute>
                  <ResponsiveSidebar>
                    <TestResults />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/dashboard/phone"
              element={
                <ProtectedRoute>
                  <ResponsiveSidebar>
                    <WebRTCDemo />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/webrtc-demo"
              element={
                <ProtectedRoute>
                  <ResponsiveSidebar>
                    <WebRTCDemo />
                  </ResponsiveSidebar>
                </ProtectedRoute>
              }
            />
            
            {/* Catch all route - redirect to landing for unauthenticated, dashboard for authenticated */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
