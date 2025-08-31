// filepath: frontend/src/pages/NotFoundPage.tsx
import { Box, Typography, Paper, Button } from '@mui/material';
import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => (
  <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '70vh', px: 2 }}>
    <Paper
      elevation={0}
      sx={{
        p: 5,
        maxWidth: 520,
        textAlign: 'center',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden',
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(700px 120px at 50% -60px, rgba(168,85,247,0.12), transparent 60%)',
        },
      }}
    >
      <Typography variant="h1" sx={{ fontWeight: 800, letterSpacing: 1 }}>404</Typography>
      <Typography variant="h5" sx={{ mt: 1 }}>Page Not Found</Typography>
      <Typography sx={{ mt: 1, mb: 3 }} color="text.secondary">
        The page you are looking for does not exist.
      </Typography>
      <Button component={Link} to="/home" variant="contained">Go to Homepage</Button>
    </Paper>
  </Box>
);

export default NotFoundPage;
