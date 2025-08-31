import React, { useState, useEffect, type FormEvent } from 'react';
import {
  Box,
  Button,
  Typography,
  Switch,
  Alert,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton
} from '@mui/material';
import { type GridColDef } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockIcon from '@mui/icons-material/Lock';
import apiClient from '../../api/apiClient.ts';
import { type User } from '../../context/AuthContext.tsx';
import useAuth from '../../hooks/useAuth.ts';
import { DashboardLayout } from '../../components/DashboardLayout.tsx';

type ManagedUser = User & {
  pending_invite_token?: string;
};

interface Invitation {
  token: string;
}

const AdminDashboard: React.FC = () => {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State for the Control Modal (managed by DashboardLayout)
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // State for the separate Create User Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [lastInvitation, setLastInvitation] = useState<Invitation | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<ManagedUser[]>('/users');
      setUsers(response.data);
    } catch (err) {
      setError('Failed to fetch user accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (isActive: boolean) => {
    if (!selectedUser) return;
    try {
      await apiClient.put(`/users/${selectedUser.id}/status`, { is_active: isActive });
      setSelectedUser(null); // Close the modal
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status.');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    if (window.confirm(`Are you sure you want to delete ${selectedUser.email}?`)) {
      await apiClient.delete(`/users/${selectedUser.id}`);
      setSelectedUser(null); // Close the modal
      fetchUsers();
    }
  };

  const handleCopyLink = (token: string) => {
    const inviteLink = `${window.location.origin}/accept-invite/${token}`;
    navigator.clipboard.writeText(inviteLink).then(() => alert('Invitation link copied!'));
  };

  const handleInviteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setLastInvitation(null);
    try {
      const response = await apiClient.post<Invitation>('/users/invite', {
        email: newUserEmail,
        full_name: newUserFullName,
        role: 'user',
      });
      setLastInvitation(response.data);
      setNewUserEmail('');
      setNewUserFullName('');
      fetchUsers();
    } catch (err: any) {
      setInviteError(err.response?.data?.detail || 'Failed to create invitation.');
    }
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setNewUserEmail('');
    setNewUserFullName('');
    setInviteError('');
    setLastInvitation(null);
  };

  const columns: GridColDef[] = [
    { field: 'full_name', headerName: 'Name', flex: 1, valueGetter: (value) => value || 'Pending Invite' },
    { field: 'email', headerName: 'Email', flex: 1.5 },
    { field: 'is_active', headerName: 'Status', flex: 0.5, renderCell: (params) => (params.value ? 'Active' : 'Inactive') },
    { field: 'created_at', headerName: 'Invited On', flex: 1, valueGetter: (value) => new Date(value).toLocaleDateString() },
    { field: 'last_login', headerName: 'Last Login', flex: 1, valueGetter: (value) => (value ? new Date(value).toLocaleString() : 'Never') },
  ];

  return (
    <>
      <DashboardLayout
        title="Admin Dashboard"
        data={users}
        columns={columns}
        isLoading={isLoading}
        error={error}
        selectedItem={selectedUser}
        onRowClick={(user) => setSelectedUser(user)}
        onCloseModal={() => setSelectedUser(null)}
        renderModalContent={(user) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, width: 300 }}>
            {user.pending_invite_token && (
              <Button
                variant="outlined"
                onClick={() => handleCopyLink(user.pending_invite_token!)}
                startIcon={<ContentCopyIcon />}
              >
                Copy Invitation Link
              </Button>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Status: {user.is_active ? 'Active' : 'Inactive'}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {user.status_locked && (
                  <LockIcon
                    fontSize="small"
                    color="disabled"
                    sx={{ mr: 1 }}
                    titleAccess="Status locked by Superadmin"
                  />
                )}
                <Switch
                  checked={user.is_active}
                  onChange={(e) => handleStatusChange(e.target.checked)}
                  disabled={user.status_locked}
                />
              </Box>
            </Box>
          </Box>
        )}
        renderModalActions={() => (
          <Button onClick={() => handleDelete()} color="error" startIcon={<DeleteIcon />}>
            Delete User
          </Button>
        )}
        // NEW: show the message at the top of the page (above the table)
        topNotice={
          <Alert severity="info">
            Your user creation quota is:{' '}
            {adminUser?.user_creation_limit === -1 ? 'Unlimited' : adminUser?.user_creation_limit}.
            {' '}You have created {users.length} user(s).
          </Alert>
        }
      >
        <Button
          variant="contained"
          onClick={() => setCreateModalOpen(true)}
          disabled={
            !adminUser?.can_create_users ||
            (adminUser.user_creation_limit !== -1 && adminUser.user_creation_limit <= users.length)
          }
        >
          Create User
        </Button>
      </DashboardLayout>

      {/* Create User Modal (separate from the main layout's control modal) */}
      <Dialog open={createModalOpen} onClose={closeCreateModal} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleInviteSubmit}>
          <DialogTitle>Create New User Invitation</DialogTitle>
          <DialogContent>
            {inviteError && <Alert severity="error" sx={{ my: 2 }}>{inviteError}</Alert>}
            {lastInvitation ? (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Invitation created successfully!
                </Alert>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    my: 2,
                    p: 1,
                    border: '1px solid',
                    borderColor: 'grey.400',
                    borderRadius: 1,
                  }}
                >
                  <TextField
                    label="Invitation Link"
                    value={`${window.location.origin}/accept-invite/${lastInvitation.token}`}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                  <IconButton
                    onClick={() => handleCopyLink(lastInvitation.token)}
                    color="primary"
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Box>
              </Box>
            ) : (
              <>
                <TextField
                  autoFocus
                  margin="dense"
                  label="User's Full Name"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  required
                />
                <TextField
                  margin="dense"
                  label="User's Email Address"
                  type="email"
                  fullWidth
                  variant="outlined"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCreateModal}>Close</Button>
            {!lastInvitation && <Button type="submit" variant="contained">Create</Button>}
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
};

export default AdminDashboard;
