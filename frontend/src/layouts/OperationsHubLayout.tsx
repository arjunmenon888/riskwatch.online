// filepath: frontend/src/layouts/OperationsHubLayout.tsx
import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { hubFeatures } from '../config/operationsHubConfig';

const drawerWidth = 280;

const OperationsHubLayout: React.FC = () => {
  const location = useLocation();

  const drawer = (
    <div>
      <Toolbar sx={{ p: '16px !important' }}>
        <Typography variant="h6" noWrap component="div">
          Operations Hub
        </Typography>
      </Toolbar>
      <List>
        {hubFeatures.map((feature) => (
          <ListItem key={feature.title} disablePadding>
            <ListItemButton
              component={NavLink}
              to={feature.path}
              selected={location.pathname === feature.path}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {React.cloneElement(feature.icon, { fontSize: 'small' })}
              </ListItemIcon>
              <ListItemText primary={feature.title} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}
      >
        {/* The Outlet will render the specific page (dashboard or feature) */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default OperationsHubLayout;