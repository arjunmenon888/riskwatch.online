// filepath: frontend/src/pages/superadmin/MyTrainingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  CircularProgress,
  Alert,
  Switch, // <-- Import Switch
  Tooltip, // <-- Import Tooltip for better UX
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRowParams } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../../api/apiClient.ts';
import { type TrainingManagementListItem } from '../../types/training.ts';

const MyTrainingsPage: React.FC = () => {
  const [trainings, setTrainings] = useState<TrainingManagementListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchTrainings = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<TrainingManagementListItem[]>('/trainings/my-trainings');
      setTrainings(response.data);
    } catch (err) {
      setError('Failed to load trainings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  // --- NEW: Handler for the publish toggle switch ---
  const handlePublishToggle = async (trainingId: number, is_published: boolean) => {
    // Optimistically update the UI for a faster feel
    setTrainings(prev => 
      prev.map(t => t.id === trainingId ? { ...t, is_published } : t)
    );

    try {
      await apiClient.put(`/trainings/${trainingId}/publish`, { is_published });
      // You could show a success toast here
    } catch (err) {
      alert('Failed to update publish status.');
      // Revert the change on error
      setTrainings(prev => 
        prev.map(t => t.id === trainingId ? { ...t, is_published: !is_published } : t)
      );
    }
  };
  
  const handleDeleteTraining = async (trainingId: number) => {
    if (window.confirm('Are you sure you want to permanently delete this training and all its content?')) {
        try {
            await apiClient.delete(`/trainings/${trainingId}`);
            fetchTrainings(); // Refresh the list
        } catch (err) {
            alert('Failed to delete training.');
        }
    }
  }

  const columns: GridColDef[] = [
    { field: 'title', headerName: 'Title', flex: 2 },
    {
      field: 'is_published',
      headerName: 'Status',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title={params.value ? 'Published - Visible to users' : 'Draft - Hidden from users'}>
            <Switch
              checked={params.value}
              onChange={(e) => handlePublishToggle(params.row.id, e.target.checked)}
              onClick={(e) => e.stopPropagation()} // Prevent row click when toggling
            />
          </Tooltip>
          {params.value ? 'Published' : 'Draft'}
        </Box>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created On',
      flex: 1,
      valueGetter: (value) => value && new Date(value).toLocaleDateString(),
    },
    {
        field: 'actions',
        headerName: 'Actions',
        flex: 1,
        sortable: false,
        renderCell: (params) => (
            <Box>
                <Button 
                    startIcon={<EditIcon />} 
                    onClick={() => navigate(`/superadmin/training/${params.row.id}/edit`)}
                >
                    Edit
                </Button>
                <Button 
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteTraining(params.row.id)}
                >
                    Delete
                </Button>
            </Box>
        )
    }
  ];

  if (isLoading) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1">My Trainings</Typography>
            <Button variant="contained" component={RouterLink} to="/superadmin/create-training">
                Create New Training
            </Button>
        </Box>
      <Paper sx={{ height: '70vh', width: '100%' }}>
        <DataGrid
          rows={trainings}
          columns={columns}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
        />
      </Paper>
    </Container>
  );
};

export default MyTrainingsPage;