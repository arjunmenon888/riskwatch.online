// filepath: frontend/src/components/Navbar.tsx
import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Collapse,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.ts';
import apiClient from '../api/apiClient.ts';
import { type TrainingListItem } from '../types/training.ts';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State for PUBLIC training dropdown (desktop)
  const [trainings, setTrainings] = useState<TrainingListItem[]>([]);
  const [publicAnchorEl, setPublicAnchorEl] = useState<null | HTMLElement>(null);
  const isPublicMenuOpen = Boolean(publicAnchorEl);

  // State for SUPERADMIN training dropdown (desktop)
  const [manageAnchorEl, setManageAnchorEl] = useState<null | HTMLElement>(null);
  const isManageMenuOpen = Boolean(manageAnchorEl);

  // Mobile Drawer
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMobileMenu = () => setMobileOpen(prev => !prev);

  // Mobile collapsibles
  const [mobileTrainingOpen, setMobileTrainingOpen] = useState(false);
  const [mobileManageOpen, setMobileManageOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      apiClient
        .get<TrainingListItem[]>('/trainings/published')
        .then(response => setTrainings(response.data))
        .catch(console.error);
    }
  }, [isAuthenticated]);

  // Handlers for PUBLIC training menu (desktop)
  const handlePublicMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setPublicAnchorEl(event.currentTarget);
  };
  const handlePublicMenuClose = () => setPublicAnchorEl(null);

  // Handlers for SUPERADMIN training menu (desktop)
  const handleManageMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setManageAnchorEl(event.currentTarget);
  };
  const handleManageMenuClose = () => setManageAnchorEl(null);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  // Shared nav links for desktop
  const renderDesktopLinks = () => (
    <>
      <Button size="small" variant="outlined" component={RouterLink} to="/home">
        Home
      </Button>

      {/* --- LINK TO OPERATIONS HUB --- */}
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
            {trainings.map(training => (
              <MenuItem
                key={training.id}
                component={RouterLink}
                to={`/training/${training.id}`}
                onClick={handlePublicMenuClose}
              >
                {training.title}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}

      {user?.role === 'superadmin' && (
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
            <MenuItem
              component={RouterLink}
              to="/superadmin/my-trainings"
              onClick={handleManageMenuClose}
            >
              My Trainings
            </MenuItem>
            <MenuItem
              component={RouterLink}
              to="/superadmin/create-training"
              onClick={handleManageMenuClose}
            >
              Create Training
            </MenuItem>
          </Menu>
        </>
      )}

      {user?.role === 'admin' && (
        <Button size="small" variant="outlined" component={RouterLink} to="/admin">
          Users
        </Button>
      )}

      <Button size="small" variant="contained" onClick={handleLogout}>
        Logout ({user?.full_name || user?.email})
      </Button>
    </>
  );

  // Mobile drawer content
  const renderMobileList = () => (
    <Box sx={{ width: 280, p: 2 }} role="presentation">
      <List>
        <ListItem disableGutters>
          <Typography variant="h6" fontWeight={700}>
            Menu
          </Typography>
        </ListItem>
        <Divider sx={{ my: 1 }} />

        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/home" onClick={toggleMobileMenu}>
            <ListItemText primary="Home" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/operations-hub" onClick={toggleMobileMenu}>
            <ListItemText primary="Operations Hub" />
          </ListItemButton>
        </ListItem>

        {/* Training (collapsible) */}
        {trainings.length > 0 && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setMobileTrainingOpen(o => !o)}>
                <ListItemText primary="Training" />
                {mobileTrainingOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={mobileTrainingOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {trainings.map(t => (
                  <ListItem key={t.id} disablePadding sx={{ pl: 3 }}>
                    <ListItemButton
                      component={RouterLink}
                      to={`/training/${t.id}`}
                      onClick={toggleMobileMenu}
                    >
                      <ListItemText primary={t.title} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}

        {/* Superadmin links */}
        {user?.role === 'superadmin' && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/superadmin" onClick={toggleMobileMenu}>
                <ListItemText primary="Admins" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={RouterLink}
                to="/superadmin/news-fetcher"
                onClick={toggleMobileMenu}
              >
                <ListItemText primary="News Fetcher" />
              </ListItemButton>
            </ListItem>

            {/* Manage Trainings (collapsible) */}
            <ListItem disablePadding>
              <ListItemButton onClick={() => setMobileManageOpen(o => !o)}>
                <ListItemText primary="Manage Trainings" />
                {mobileManageOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={mobileManageOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItem disablePadding sx={{ pl: 3 }}>
                  <ListItemButton
                    component={RouterLink}
                    to="/superadmin/my-trainings"
                    onClick={toggleMobileMenu}
                  >
                    <ListItemText primary="My Trainings" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding sx={{ pl: 3 }}>
                  <ListItemButton
                    component={RouterLink}
                    to="/superadmin/create-training"
                    onClick={toggleMobileMenu}
                  >
                    <ListItemText primary="Create Training" />
                  </ListItemButton>
                </ListItem>
              </List>
            </Collapse>
          </>
        )}

        {/* Admin link */}
        {user?.role === 'admin' && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/admin" onClick={toggleMobileMenu}>
                <ListItemText primary="Users" />
              </ListItemButton>
            </ListItem>
          </>
        )}

        <Divider sx={{ my: 1 }} />
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              toggleMobileMenu();
              handleLogout();
            }}
          >
            <ListItemText primary={`Logout (${user?.full_name || user?.email})`} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <AppBar position="sticky">
      <Toolbar sx={{ gap: 1 }}>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            flexGrow: 1,
            letterSpacing: 0.4,
            fontWeight: 700,
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          RiskWatch
        </Typography>

        {/* When not authenticated */}
        {!isAuthenticated && (
          <Button size="small" variant="contained" component={RouterLink} to="/auth/login">
            Login
          </Button>
        )}

        {/* When authenticated */}
        {isAuthenticated && user && (
          <>
            {isMobile ? (
              <>
                <IconButton
                  color="inherit"
                  edge="end"
                  aria-label="open navigation menu"
                  onClick={toggleMobileMenu}
                >
                  <MenuIcon />
                </IconButton>
                <Drawer anchor="right" open={mobileOpen} onClose={toggleMobileMenu}>
                  {renderMobileList()}
                </Drawer>
              </>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                  alignItems: 'center'
                }}
              >
                {renderDesktopLinks()}
              </Box>
            )}
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
