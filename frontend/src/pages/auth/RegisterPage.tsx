import React, { useState, type FormEvent } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import apiClient from '../../api/apiClient.ts';
import { Container, Box, TextField, Button, Typography, Alert, Link, Paper } from '@mui/material';

const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      await apiClient.post('/auth/register', {
        full_name: fullName,
        email,
        password,
        company_name: companyName,
      });
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/auth/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed.');
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
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
              'radial-gradient(600px 100px at 30% -60px, rgba(56,189,248,0.10), transparent 60%)',
          },
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography component="h1" variant="h5" fontWeight={700}>
            Register as Admin
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField margin="normal" required fullWidth label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <TextField margin="normal" required fullWidth label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <TextField margin="normal" required fullWidth label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField margin="normal" required fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <TextField margin="normal" required fullWidth label="Re-enter Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }} disabled={!!success}>
            Register
          </Button>
          <Link component={RouterLink} to="/auth/login" variant="body2" sx={{ display: 'inline-block', mt: 1 }}>
            Already have an account? Sign In
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default RegisterPage;
