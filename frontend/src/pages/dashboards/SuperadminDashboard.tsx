import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography, Switch
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import apiClient from '../../api/apiClient.ts';
import { type User } from '../../context/AuthContext.tsx';
import { DashboardLayout } from '../../components/DashboardLayout.tsx';

type AdminUser = User & {
  users_created_count?: number;
};

const SuperadminDashboard: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State for the values inside the modal
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [editLimit, setEditLimit] = useState(0);
  const [editIsActive, setEditIsActive] = useState(true);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<AdminUser[]>('/superadmin/admins');
      setAdmins(response.data);
    } catch (err) {
      setError('Failed to fetch admin accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // --- THIS IS THE CORRECTED LOGIC ---
  const handleRowClick = (admin: AdminUser) => {
    // Set the state for the modal here, in a regular event handler
    setSelectedAdmin(admin);
    setEditLimit(admin.user_creation_limit);
    setEditIsActive(admin.is_active);
  };
  
  const handleCloseModal = () => {
    setSelectedAdmin(null);
  }
  // --- END OF CORRECTION ---
  
  const handleSaveChanges = async (closeModal: () => void) => {
    if (!selectedAdmin) return;
    try {
      await apiClient.put(`/users/${selectedAdmin.id}/status`, { is_active: editIsActive });
      await apiClient.put(`/superadmin/admins/${selectedAdmin.id}/settings`, {
        can_create_users: selectedAdmin.can_create_users,
        user_creation_limit: editLimit,
      });
      closeModal();
      fetchAdmins();
    } catch (err) {
      alert(`Failed to save settings for ${selectedAdmin.email}.`);
    }
  };
  
  const handleDelete = async (closeModal: () => void) => {
    if (!selectedAdmin) return;
    if (window.confirm(`Are you sure you want to delete ${selectedAdmin.email}? This will also delete all users they created.`)) {
      await apiClient.delete(`/superadmin/admins/${selectedAdmin.id}`);
      closeModal();
      fetchAdmins();
    }
  };

  const columns: GridColDef[] = [
    { field: 'full_name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1.5 },
    { field: 'is_active', headerName: 'Status', flex: 0.5, renderCell: (params) => (params.value ? 'Active' : 'Inactive') },
    { field: 'created_at', headerName: 'Created On', flex: 1, valueGetter: (value) => value && new Date(value).toLocaleDateString() },
    { field: 'last_login', headerName: 'Last Login', flex: 1, valueGetter: (value) => value ? new Date(value).toLocaleString() : 'Never' },
    { field: 'users_created_count', headerName: 'Users Created', type: 'number', flex: 0.5 }
  ];

  return (
    <DashboardLayout
      title="Superadmin Dashboard"
      data={admins}
      columns={columns}
      isLoading={isLoading}
      error={error}
      // Pass the correct handler to the layout
      onRowClick={handleRowClick}
      // Use the selectedAdmin from state to control the modal
      selectedItem={selectedAdmin}
      onCloseModal={handleCloseModal}
      renderModalContent={(admin) => (
        // Now this is just a simple render function with no hooks
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>Status: {editIsActive ? 'Active' : 'Inactive'}</Typography>
            <Switch checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
          </Box>
          <TextField
            label="User Creation Limit"
            type="number"
            value={editLimit}
            onChange={(e) => setEditLimit(parseInt(e.target.value, 10))}
            fullWidth
          />
          <Typography>Users Created: {admin.users_created_count}</Typography>
        </Box>
      )}
      renderModalActions={(closeModal) => (
        <>
          <Button onClick={() => handleDelete(closeModal)} color="error" startIcon={<DeleteIcon />}>Delete</Button>
          <Button onClick={() => handleSaveChanges(closeModal)} variant="contained" startIcon={<SaveIcon />}>Save</Button>
        </>
      )}
    />
  );
};

export default SuperadminDashboard;