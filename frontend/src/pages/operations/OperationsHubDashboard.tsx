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
} from '@mui/material';
import { hubFeatures } from '../../config/operationsHubConfig';

const OperationsHubDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Operations Hub
      </Typography>
      <Grid container spacing={3}>
        {hubFeatures.map((feature) => (
          // --- THIS IS THE FIX ---
          // The 'item' prop is no longer used in MUI v5+.
          // The presence of breakpoint props like 'xs', 'sm', 'md'
          // automatically makes the Grid component a grid item.
          <Grid xs={12} sm={6} md={4} key={feature.title}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
    </Box>
  );
};

export default OperationsHubDashboard;