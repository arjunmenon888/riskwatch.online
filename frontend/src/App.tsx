import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext.tsx';
import theme from './theme.ts';

import LoginPage from './pages/auth/LoginPage.tsx';
import AcceptInvitePage from './pages/auth/AcceptInvitePage.tsx';
import RegisterPage from './pages/auth/RegisterPage.tsx';
import HomePage from './pages/HomePage.tsx';
import SuperadminDashboard from './pages/dashboards/SuperadminDashboard.tsx';
import AdminDashboard from './pages/dashboards/AdminDashboard.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import Navbar from './components/Navbar.tsx';
import NotFoundPage from './pages/NotFoundPage.tsx';
import UnauthorizedPage from './pages/UnauthorizedPage.tsx';

// --- NEW IMPORTS ---
import NewsFetcherPage from './pages/dashboards/NewsFetcherPage.tsx';
import NewsDetailPage from './pages/NewsDetailPage.tsx';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            {/* Public Routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
            <Route path="/news/:postId" element={<NewsDetailPage />} /> {/* New public detail page */}

            {/* Common Protected Route */}
            <Route
              path="/home"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <HomePage />
                </ProtectedRoute>
              }
            />

            {/* Superadmin Routes */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperadminDashboard />
                </ProtectedRoute>
              }
            />
            {/* New Superadmin Route */}
            <Route
              path="/superadmin/news-fetcher"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <NewsFetcherPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Utility Routes */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/" element={<Navigate to="/home" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;