// filepath: frontend/src/pages/auth/AcceptInvitePage.tsx
import React, { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { Container, Box, TextField, Button, Typography, Alert, Paper } from '@mui/material';

const AcceptInvitePage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setSuccess('');

    try {
      await apiClient.post(`/auth/accept-invite/${token}`, { password });
      setSuccess('Account activated successfully! Redirecting to login...');
      setTimeout(() => navigate('/auth/login'), 3000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Failed to activate account. The link may be invalid or expired.'
      );
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
          backdropFilter: 'blur(12px)',
          '&:before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(600px 100px at 30% -60px, rgba(56,189,248,0.10), transparent 60%)',
          },
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography component="h1" variant="h5" fontWeight={700}>
            Activate Your Account
          </Typography>
          <Typography component="p" sx={{ mt: 1 }} color="text.secondary">
            Set a password to complete your registration.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }} disabled={!!success}>
            Set Password & Activate
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AcceptInvitePage;
