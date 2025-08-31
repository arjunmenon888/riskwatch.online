// filepath: frontend/src/pages/UnauthorizedPage.tsx
import { Box, Typography, Button, Paper } from '@mui/material';
import React from 'react';
import { Link } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => (
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
            'radial-gradient(700px 120px at 50% -60px, rgba(56,189,248,0.12), transparent 60%)',
        },
      }}
    >
      <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
        403 - Forbidden
      </Typography>
      <Typography variant="h6" sx={{ mt: 1 }}>You do not have permission to access this page.</Typography>
      <Button component={Link} to="/home" variant="contained" sx={{ mt: 3 }}>
        Go to Homepage
      </Button>
    </Paper>
  </Box>
);

export default UnauthorizedPage;
