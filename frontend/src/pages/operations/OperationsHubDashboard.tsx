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
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { hubFeatures } from '../../config/operationsHubConfig';

const OperationsHubDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // mobile detection

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Operations Hub
      </Typography>

      {isMobile ? (
        // 📱 Mobile Layout → Sidebar List
        <List>
          {hubFeatures.map((feature, idx) => (
            <React.Fragment key={feature.title}>
              <ListItem disablePadding>
                <ListItemButton onClick={() => navigate(feature.path)}>
                  <ListItemIcon>{feature.icon}</ListItemIcon>
                  <ListItemText
                    primary={feature.title}
                    secondary={feature.description}
                  />
                  <Chip label="0" color="secondary" size="small" />
                </ListItemButton>
              </ListItem>
              {idx < hubFeatures.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      ) : (
        // 💻 Desktop Layout → Card Grid
        <Grid container spacing={3}>
          {hubFeatures.map((feature) => (
            <Grid xs={12} sm={6} md={4} key={feature.title}>
              <Card
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <CardActionArea
                  onClick={() => navigate(feature.path)}
                  sx={{ flexGrow: 1, p: 2 }}
                >
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
      )}
    </Box>
  );
};

export default OperationsHubDashboard;
