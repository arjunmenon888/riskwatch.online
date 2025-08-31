import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.ts';
import { type UserRole } from '../context/AuthContext.tsx';
import { CircularProgress, Box, Paper } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Loading: center spinner on a subtle glass panel
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh" px={2}>
        <Paper
          sx={{
            p: 4,
            borderRadius: 4,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
          }}
        >
          <CircularProgress />
        </Paper>
      </Box>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;

  const userHasRequiredRole = user && allowedRoles.includes(user.role);
  if (!userHasRequiredRole) return <Navigate to="/unauthorized" replace />;

  return children;
};

export default ProtectedRoute;
