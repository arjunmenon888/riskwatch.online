import React, { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container, Typography, Box, CircularProgress, Alert, Paper, Button, Breadcrumbs, Link as MuiLink,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import apiClient from '../../api/apiClient.ts';
import { type Training } from '../../types/training.ts';
import ModuleEditor from '../../components/superadmin/ModuleEditor.tsx';

const TrainingBuilderPage: React.FC = () => {
  const { trainingId } = useParams<{ trainingId: string }>();
  const [training, setTraining] = useState<Training | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for the new module dialog
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');

  const fetchTraining = useCallback(async () => {
    if (!trainingId) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get<Training>(`/trainings/${trainingId}`);
      setTraining(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load training data.');
    } finally {
      setIsLoading(false);
    }
  }, [trainingId]);

  useEffect(() => {
    fetchTraining();
  }, [fetchTraining]);

  const handleOpenModuleDialog = () => {
    setIsModuleDialogOpen(true);
  };

  const handleCloseModuleDialog = () => {
    setIsModuleDialogOpen(false);
    setNewModuleName(''); // Reset on close
  };

  const handleAddModuleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!training || !newModuleName.trim()) return;
    
    try {
      await apiClient.post(`/trainings/${training.id}/modules`, {
        title: newModuleName.trim(),
        order: training.modules.length,
      });
      handleCloseModuleDialog();
      fetchTraining(); // Refetch to get the new module with its ID
    } catch (err) {
      alert('Failed to add module.');
    }
  };
  
  if (isLoading) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!training) {
    return <Alert severity="info">Training not found.</Alert>;
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={RouterLink} underline="hover" color="inherit" to="/home" sx={{ display: 'flex', alignItems: 'center' }}>
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" /> Home
          </MuiLink>
          <Typography color="text.primary">Training Builder</Typography>
        </Breadcrumbs>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>Editing: {training.title}</Typography>
          <Typography color="text.secondary">{training.description}</Typography>
        </Paper>
        
        {training.modules.map(module => (
          <ModuleEditor key={module.id} module={module} onUpdate={fetchTraining} />
        ))}

        <Button variant="contained" onClick={handleOpenModuleDialog} sx={{ mt: 2 }}>
          Add Module
        </Button>
      </Container>

      {/* Add Module Dialog */}
      <Dialog open={isModuleDialogOpen} onClose={handleCloseModuleDialog}>
        <Box component="form" onSubmit={handleAddModuleSubmit}>
          <DialogTitle>Add New Module</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Enter the title for the new module. You can add lessons to it after it's created.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Module Title"
              type="text"
              fullWidth
              variant="standard"
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModuleDialog}>Cancel</Button>
            <Button type="submit">Add</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
};

export default TrainingBuilderPage;
