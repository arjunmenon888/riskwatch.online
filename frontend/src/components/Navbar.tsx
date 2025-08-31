import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.ts';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <AppBar position="sticky">
      <Toolbar sx={{ gap: 1 }}>
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            letterSpacing: 0.4,
            fontWeight: 700,
            a: { textDecoration: 'none', color: 'inherit' },
          }}
        >
          <RouterLink to="/">RiskWatch</RouterLink>
        </Typography>

        {isAuthenticated && user && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {user.role === 'superadmin' && (
              <>
                <Button size="small" variant="outlined" component={RouterLink} to="/superadmin">
                  Admins
                </Button>
                {/* --- NEW LINK --- */}
                <Button size="small" variant="outlined" component={RouterLink} to="/superadmin/news-fetcher">
                  News Fetcher
                </Button>
              </>
            )}
            {user.role === 'admin' && (
              <Button size="small" variant="outlined" component={RouterLink} to="/admin">
                Users
              </Button>
            )}
            <Button size="small" variant="outlined" component={RouterLink} to="/home">
              Home
            </Button>
            <Button size="small" variant="contained" onClick={handleLogout}>
              Logout ({user.full_name || user.email})
            </Button>
          </Box>
        )}
        {!isAuthenticated && (
          <Button size="small" variant="contained" component={RouterLink} to="/auth/login">
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;