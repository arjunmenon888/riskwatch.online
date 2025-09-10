// filepath: frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext.tsx';
import theme from './theme.ts';

// --- Page Imports ---

// Auth Pages
import LoginPage from './pages/auth/LoginPage.tsx';
import AcceptInvitePage from './pages/auth/AcceptInvitePage.tsx';
import RegisterPage from './pages/auth/RegisterPage.tsx';

// General Pages
import HomePage from './pages/HomePage.tsx';
import NewsDetailPage from './pages/NewsDetailPage.tsx';
import NotFoundPage from './pages/NotFoundPage.tsx';
import UnauthorizedPage from './pages/UnauthorizedPage.tsx';

// Dashboard Pages
import SuperadminDashboard from './pages/dashboards/SuperadminDashboard.tsx';
import AdminDashboard from './pages/dashboards/AdminDashboard.tsx';
import NewsFetcherPage from './pages/dashboards/NewsFetcherPage.tsx';

// Training System Pages
import CreateTrainingPage from './pages/superadmin/CreateTrainingPage.tsx';
import TrainingBuilderPage from './pages/superadmin/TrainingBuilderPage.tsx';
import MyTrainingsPage from './pages/superadmin/MyTrainingsPage.tsx';
import TrainingDashboardPage from './pages/TrainingDashboardPage.tsx';

// --- Operations Hub Imports (flattened, no layout) ---
import OperationsHubDashboard from './pages/operations/OperationsHubDashboard.tsx';
import IncidentsPage from './pages/operations/IncidentsPage.tsx';
import WorkOrdersPage from './pages/operations/WorkOrdersPage.tsx';
import AssetsPage from './pages/operations/AssetsPage.tsx';
import InspectionsPage from './pages/operations/InspectionsPage.tsx';
import PtwPage from './pages/operations/PtwPage.tsx';
import MocPage from './pages/operations/MocPage.tsx';
import InvestigationsPage from './pages/operations/InvestigationsPage.tsx';
import AuditsPage from './pages/operations/AuditsPage.tsx';
import AnalyticsPage from './pages/operations/AnalyticsPage.tsx';

// --- Component Imports ---
import ProtectedRoute from './components/ProtectedRoute.tsx';
import Navbar from './components/Navbar.tsx';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            {/* ======================================== */}
            {/* Public Routes                            */}
            {/* ======================================== */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
            <Route path="/news/:postId" element={<NewsDetailPage />} />

            {/* ======================================== */}
            {/* Common Protected Routes                   */}
            {/* ======================================== */}
            <Route
              path="/home"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/training/:trainingId"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <TrainingDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* ======================================== */}
            {/* Superadmin Routes                         */}
            {/* ======================================== */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperadminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/news-fetcher"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <NewsFetcherPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/my-trainings"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <MyTrainingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/create-training"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <CreateTrainingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/training/:trainingId/edit"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <TrainingBuilderPage />
                </ProtectedRoute>
              }
            />

            {/* ======================================== */}
            {/* Admin Routes                              */}
            {/* ======================================== */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* ======================================== */}
            {/* Operations Hub (Flattened, no layout)     */}
            {/* ======================================== */}
            <Route
              path="/operations-hub"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <OperationsHubDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations-hub/incidents"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <IncidentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations-hub/work-orders"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <WorkOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations-hub/assets"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <AssetsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations-hub/inspections"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <InspectionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations-hub/ptw"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <PtwPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations-hub/moc"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <MocPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations-hub/investigations"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <InvestigationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations-hub/audits"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <AuditsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/operations-hub/analytics"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'user']}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />

            {/* ======================================== */}
            {/* Utility & Fallback Routes                 */}
            {/* ======================================== */}
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
