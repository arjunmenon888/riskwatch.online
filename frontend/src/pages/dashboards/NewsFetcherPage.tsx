// filepath: frontend/src/pages/dashboards/NewsFetcherPage.tsx
import React, { useState, useRef, useEffect, type FormEvent, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  IconButton,
  ListItemText,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { type FetchStatus, type NewsSource } from '../../types/news.ts';
import apiClient from '../../api/apiClient.ts';

const NewsFetcherPage: React.FC = () => {
  const [newSourceUrl, setNewSourceUrl] = useState<string>('');
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [status, setStatus] = useState<FetchStatus>({
    stage: 'Idle',
    progress: 0,
    message: 'Ready to start.',
    is_complete: false,
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom of the logs when new logs are added
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const response = await apiClient.get<NewsSource[]>('/news-sources');
      setSources(response.data);
    } catch (error) {
      alert('Failed to load news sources.');
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleAddSource = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSourceUrl.trim()) return;
    try {
      await apiClient.post('/news-sources', { url: newSourceUrl });
      setNewSourceUrl('');
      fetchSources(); // Refresh list after adding
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add source.');
    }
  };

  const handleDeleteSource = async (sourceId: number) => {
    if (window.confirm('Are you sure you want to delete this source?')) {
      try {
        await apiClient.delete(`/news-sources/${sourceId}`);
        setSources((prev) => prev.filter((s) => s.id !== sourceId));
      } catch (err) {
        alert('Failed to delete source.');
      }
    }
  };

  const handleStartFetch = () => {
    if (isFetching) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLogs(['Authentication token not found. Please log in again.']);
      return;
    }

    const wsUrl = `${import.meta.env.VITE_API_BASE_WS}/api/v1/superadmin/fetch-news`;

    ws.current = new WebSocket(wsUrl);
    setIsFetching(true);
    setLogs(['Connecting to fetcher service...']);
    setStatus({ stage: 'Connecting', progress: 0, message: 'Initiating connection...', is_complete: false });

    ws.current.onopen = () => {
      setLogs((prev) => [...prev, 'Connection established. Authenticating...']);
      ws.current?.send(token);
      // No command body is sent anymore; the backend knows to use the saved list.
    };

    ws.current.onmessage = (event) => {
      try {
        const data: FetchStatus = JSON.parse(event.data);
        setStatus(data);
        setLogs((prev) => [...prev, `[${data.stage}] ${data.message}`]);

        if (data.is_complete) {
          setIsFetching(false);
          ws.current?.close();
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", event.data, err);
        setLogs((prev) => [...prev, `[CLIENT ERROR] Received invalid message from server.`]);
      }
    };

    ws.current.onerror = (error) => {
      setLogs((prev) => [...prev, `WebSocket Error: Could not connect to the server. Is the backend running?`]);
      console.error('WebSocket Error:', error);
      setIsFetching(false);
    };

    ws.current.onclose = () => {
      setLogs((prev) => [...prev, 'Connection closed.']);
      setIsFetching(false);
      setStatus((prev) => ({ ...prev, stage: 'Finished', is_complete: true }));
    };
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>News Fetcher</Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Manage News Sources</Typography>
        <Box component="form" onSubmit={handleAddSource} sx={{ display: 'flex', gap: 1, alignItems: 'center', my: 2 }}>
          <TextField
            label="Add New Source URL (RSS or HTML)"
            value={newSourceUrl}
            onChange={(e) => setNewSourceUrl(e.target.value)}
            fullWidth
            size="small"
            disabled={isFetching}
          />
          <Button type="submit" variant="outlined" disabled={isFetching || !newSourceUrl.trim()}>Add</Button>
        </Box>
        {sourcesLoading ? <CircularProgress size={24} /> : (
          <List dense>
            {sources.map((source) => (
              <ListItem key={source.id} secondaryAction={
                <IconButton edge="end" onClick={() => handleDeleteSource(source.id)} disabled={isFetching}>
                  <DeleteIcon />
                </IconButton>
              }>
                <ListItemText primary={source.name} secondary={source.url} />
              </ListItem>
            ))}
          </List>
        )}
        <Button onClick={handleStartFetch} variant="contained" color="primary" sx={{ mt: 2 }} disabled={isFetching || sources.length === 0}>
          {isFetching ? 'Fetching...' : 'Fetch Latest News (1 per source)'}
        </Button>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6">Progress</Typography>
        <Box sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">{status.stage} ({Math.round(status.progress)}%)</Typography>
          <LinearProgress variant="determinate" value={status.progress} sx={{ my: 1 }} />
          <Alert severity={status.stage.toLowerCase().includes('error') ? 'error' : 'info'}>{status.message}</Alert>
        </Box>
        <Typography variant="h6" sx={{ mt: 3 }}>Live Log</Typography>
        <Box
          sx={{
            mt: 1,
            p: 2,
            backgroundColor: 'background.default',
            borderRadius: 1,
            height: '300px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
          <div ref={logsEndRef} />
        </Box>
      </Paper>
    </Container>
  );
};

export default NewsFetcherPage;