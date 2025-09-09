// filepath: frontend/src/pages/operations/FeaturePagePlaceholder.tsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Toolbar,
  Button,
  Paper,
  TextField,
  InputAdornment,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

interface FeaturePagePlaceholderProps {
  title: string;
}

const FeaturePagePlaceholder: React.FC<FeaturePagePlaceholderProps> = ({ title }) => {
  return (
    <Box>
      {/* Header */}
      <Toolbar disableGutters sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" component="h1">
            {title}
          </Typography>
          <Breadcrumbs aria-label="breadcrumb">
            <Link
              component={RouterLink}
              underline="hover"
              color="inherit"
              to="/operations-hub"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Operations Hub
            </Link>
            <Typography color="text.primary">{title}</Typography>
          </Breadcrumbs>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" disabled>New</Button>
          <Button variant="outlined" disabled>Export</Button>
          <Button variant="outlined" disabled>Filter</Button>
        </Box>
      </Toolbar>

      {/* Main Content Area */}
      <Paper sx={{ p: 2 }}>
        {/* Disabled Controls */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            placeholder={`Search ${title}...`}
            variant="outlined"
            size="small"
            disabled
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="outlined" startIcon={<FilterListIcon />} disabled>
            Filters
          </Button>
        </Box>

        {/* Empty State */}
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No data yet.
          </Typography>
          <Typography color="text.secondary">
            Connect to the EAM/HSE backend to fetch live records.
          </Typography>
          <Typography variant="caption" display="block" color="text.disabled" sx={{mt: 4}}>
            This is a placeholder for future integration.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default FeaturePagePlaceholder;