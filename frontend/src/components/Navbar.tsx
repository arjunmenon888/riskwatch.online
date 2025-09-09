// filepath: frontend/src/components/Navbar.tsx
import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Menu, MenuItem } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.ts';
import apiClient from '../api/apiClient.ts';
import { type TrainingListItem } from '../types/training.ts';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // State for PUBLIC training dropdown
  const [trainings, setTrainings] = useState<TrainingListItem[]>([]);
  const [publicAnchorEl, setPublicAnchorEl] = useState<null | HTMLElement>(null);
  const isPublicMenuOpen = Boolean(publicAnchorEl);

  // State for SUPERADMIN training dropdown
  const [manageAnchorEl, setManageAnchorEl] = useState<null | HTMLElement>(null);
  const isManageMenuOpen = Boolean(manageAnchorEl);

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.get<TrainingListItem[]>('/trainings/published')
        .then(response => setTrainings(response.data))
        .catch(console.error);
    }
  }, [isAuthenticated]);
  
  // Handlers for PUBLIC training menu
  const handlePublicMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setPublicAnchorEl(event.currentTarget);
  };
  const handlePublicMenuClose = () => {
    setPublicAnchorEl(null);
  };
  
  // Handlers for SUPERADMIN training menu
  const handleManageMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setManageAnchorEl(event.currentTarget);
  };
  const handleManageMenuClose = () => {
    setManageAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <AppBar position="sticky">
      <Toolbar sx={{ gap: 1 }}>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{ flexGrow: 1, letterSpacing: 0.4, fontWeight: 700, textDecoration: 'none', color: 'inherit' }}
        >
          RiskWatch
        </Typography>

        {isAuthenticated && user && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Button size="small" variant="outlined" component={RouterLink} to="/home">
              Home
            </Button>
            
            {/* --- NEW: LINK TO OPERATIONS HUB --- */}
            <Button size="small" variant="outlined" component={RouterLink} to="/operations-hub">
              Operations Hub
            </Button>
            
            {/* Public Training Dropdown (for all users) */}
            {trainings.length > 0 && (
              <>
                <Button size="small" variant="outlined" onClick={handlePublicMenuClick}>
                  Training
                </Button>
                <Menu anchorEl={publicAnchorEl} open={isPublicMenuOpen} onClose={handlePublicMenuClose}>
                  {trainings.map((training) => (
                    <MenuItem key={training.id} component={RouterLink} to={`/training/${training.id}`} onClick={handlePublicMenuClose}>
                      {training.title}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
            
            {user.role === 'superadmin' && (
              <>
                <Button size="small" variant="outlined" component={RouterLink} to="/superadmin">
                  Admins
                </Button>
                <Button size="small" variant="outlined" component={RouterLink} to="/superadmin/news-fetcher">
                  News Fetcher
                </Button>
                
                {/* SUPERADMIN Training Management Dropdown */}
                <Button size="small" variant="outlined" onClick={handleManageMenuClick}>
                  Manage Trainings
                </Button>
                <Menu anchorEl={manageAnchorEl} open={isManageMenuOpen} onClose={handleManageMenuClose}>
                  <MenuItem component={RouterLink} to="/superadmin/my-trainings" onClick={handleManageMenuClose}>
                    My Trainings
                  </MenuItem>
                  <MenuItem component={RouterLink} to="/superadmin/create-training" onClick={handleManageMenuClose}>
                    Create Training
                  </MenuItem>
                </Menu>
              </>
            )}
            {user.role === 'admin' && (
              <Button size="small" variant="outlined" component={RouterLink} to="/admin">
                Users
              </Button>
            )}
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