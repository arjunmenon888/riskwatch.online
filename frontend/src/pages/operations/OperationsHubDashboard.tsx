// filepath: frontend/src/pages/operations/OperationsHubDashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Box,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { hubFeatures } from '../../config/operationsHubConfig';

const OperationsHubDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Responsive: show "right-side cards" on desktop, "left-side list" on mobile
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- Mobile (left-side style) ---
  const MobileLeftList = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Operations Hub
      </Typography>

      <List sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
        {hubFeatures.map((feature, idx) => (
          <React.Fragment key={feature.title}>
            <ListItem disablePadding>
              <ListItemButton onClick={() => navigate(feature.path)}>
                <ListItemIcon sx={{ minWidth: 40 }}>{feature.icon}</ListItemIcon>
                <ListItemText
                  primary={feature.title}
                  secondary={feature.description}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                <Chip size="small" color="secondary" label="0" />
              </ListItemButton>
            </ListItem>
            {idx < hubFeatures.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );

  // --- Desktop (right-side cards) ---
  const DesktopRightCards = () => (
    <Box>
      <Typography variant="h4" gutterBottom>
        Operations Hub
      </Typography>

      <Grid container spacing={3}>
        {hubFeatures.map((feature) => (
          // In MUI v5+, providing xs/sm/md makes this a Grid item automatically
          <Grid xs={12} sm={6} md={4} key={feature.title}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardActionArea onClick={() => navigate(feature.path)} sx={{ flexGrow: 1, p: 2 }}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1,
                    }}
                  >
                    {feature.icon}
                    <Chip label="0" color="secondary" />
                  </Box>
                  <Typography gutterBottom variant="h6" component="div">
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return isMobile ? <MobileLeftList /> : <DesktopRightCards />;
};

export default OperationsHubDashboard;
