import React, { useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRowParams } from '@mui/x-data-grid';

export interface DataRow {
  id: number;
  full_name?: string | null;
  email: string;
}

interface DashboardLayoutProps<T extends DataRow> {
  title: string;
  data: T[];
  columns: GridColDef[];
  isLoading: boolean;
  error: string;

  // Controls for the details modal
  selectedItem: T | null;
  onRowClick: (item: T) => void;
  onCloseModal: () => void;
  renderModalContent: (item: T) => React.ReactNode;
  renderModalActions: (closeModal: () => void) => React.ReactNode;

  // Right-side header actions (e.g., "Create User" button)
  children?: React.ReactNode;

  // NEW: optional notice rendered above the table (e.g., quota banner)
  topNotice?: React.ReactNode;
}

export const DashboardLayout = <T extends DataRow>({
  title,
  data,
  columns,
  isLoading,
  error,
  selectedItem,
  onRowClick,
  onCloseModal,
  renderModalContent,
  renderModalActions,
  children,
  topNotice,
}: DashboardLayoutProps<T>) => {
  const [searchText, setSearchText] = useState('');

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    return data.filter((item) =>
      (item.full_name && item.full_name.toLowerCase().includes(searchText.toLowerCase())) ||
      item.email.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [data, searchText]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          <Box>{children}</Box>
        </Box>

        {/* NEW: top notice/banner area */}
        {topNotice && <Box sx={{ mb: 2 }}>{topNotice}</Box>}

        {/* Main panel */}
        <Paper sx={{ p: 2, height: '75vh', width: '100%' }}>
          <TextField
            label="Search by Name or Email"
            variant="outlined"
            fullWidth
            margin="normal"
            onChange={(e) => setSearchText(e.target.value)}
          />

          <DataGrid
            rows={filteredData}
            columns={columns}
            onRowClick={(params: GridRowParams<T>) => onRowClick(params.row)}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[5, 10, 25]}
            sx={{ cursor: 'pointer', border: 0 }}
            disableRowSelectionOnClick
          />
        </Paper>
      </Container>

      {/* Details modal */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onClose={onCloseModal} fullWidth maxWidth="xs">
          <DialogTitle>
            Controls for {selectedItem.full_name || selectedItem.email}
          </DialogTitle>
          <DialogContent dividers>{renderModalContent(selectedItem)}</DialogContent>
          <DialogActions>
            <Button onClick={onCloseModal}>Close</Button>
            {renderModalActions(onCloseModal)}
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};
