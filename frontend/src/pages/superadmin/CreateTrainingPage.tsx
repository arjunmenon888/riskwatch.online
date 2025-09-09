import React, { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import apiClient from '../../api/apiClient.ts';
import { type Training } from '../../types/training.ts';

const CreateTrainingPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await apiClient.post<Training>('/trainings', {
        title,
        description,
        is_published: isPublished,
      });
      // Redirect to the new training's builder page after creation
      navigate(`/superadmin/training/${response.data.id}/edit`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create training.');
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Training
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Step 1: Define the basic details for your new training course. You will add modules and lessons in the next step.
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            label="Training Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            margin="normal"
            disabled={isSubmitting}
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={4}
            margin="normal"
            disabled={isSubmitting}
          />

          <FormControlLabel
            control={
              <Switch
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                disabled={isSubmitting}
              />
            }
            label="Publish Immediately (Learners will see this training in the dropdown menu)"
          />

          <Box sx={{ mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create & Continue to Builder'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateTrainingPage;