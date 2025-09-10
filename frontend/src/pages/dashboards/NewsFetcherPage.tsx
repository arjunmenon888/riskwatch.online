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
    const trimmedUrl = newSourceUrl.trim();
    if (!trimmedUrl) return;

    // Ensure the URL has a protocol scheme (http:// or https://)
    // before sending it to the backend to satisfy Pydantic's HttpUrl validation.
    let fullUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(fullUrl)) {
      fullUrl = 'https://' + fullUrl;
    }

    try {
      // Use the corrected, full URL in the request payload
      await apiClient.post('/news-sources', { url: fullUrl });
      setNewSourceUrl('');
      fetchSources(); // Refresh list after adding
    } catch (err: any) {
      // Improved error message for better user feedback
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string' && detail.includes('URL scheme not permitted')) {
        alert('Invalid URL. Please provide a full and valid URL, e.g., "https://example.com"');
      } else {
        alert(detail || 'Failed to add source.');
      }
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

  /**
   * Resolve WS base URL from env or derive it safely at runtime.
   * Priority:
   * 1) VITE_API_BASE_WS
   * 2) Derived from VITE_API_BASE_URL (switch https->wss, strip path)
   * 3) Same-origin fallback
   */
  const resolveWsBase = () => {
    const envWs = import.meta.env.VITE_API_BASE_WS as string | undefined;
    if (envWs && !String(envWs).includes('undefined')) return String(envWs).replace(/\/$/, '');

    const envHttp = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (envHttp && !String(envHttp).includes('undefined')) {
      try {
        const u = new URL(envHttp);
        // Convert protocol
        u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
        // Drop any path like /api/v1 to keep just the origin
        u.pathname = '';
        u.search = '';
        u.hash = '';
        return u.toString().replace(/\/$/, '');
      } catch {
        // ignore and try same-origin
      }
    }

    // Same-origin fallback
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}`;
  };

  const handleStartFetch = () => {
    if (isFetching) return;

    // If there's an existing socket, close it before creating a new one
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      try { ws.current.close(); } catch {}
    }

    // Resolve base URL with fallbacks + quick one-time sanity logs
    const baseWsUrl = resolveWsBase();
    console.log('VITE_API_BASE_WS:', import.meta.env.VITE_API_BASE_WS);
    console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    console.log('Resolved WS Base URL:', baseWsUrl);

    if (!baseWsUrl || baseWsUrl.includes('undefined')) {
      const errorMessage = 'Configuration Error: VITE_API_BASE_WS is not defined in the environment. Cannot connect to WebSocket.';
      console.error(errorMessage);
      setLogs([errorMessage]);
      setStatus({ stage: 'Error', progress: 0, message: errorMessage, is_complete: true });
      return; // Stop execution
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLogs(['Authentication token not found. Please log in again.']);
      return;
    }

    const wsUrl = `${baseWsUrl}/api/v1/superadmin/fetch-news`;

    ws.current = new WebSocket(wsUrl);
    setIsFetching(true);
    setLogs(['Connecting to fetcher service...']);
    setStatus({ stage: 'Connecting', progress: 0, message: 'Initiating connection...', is_complete: false });

    ws.current.onopen = () => {
      setLogs((prev) => [...prev, 'Connection established. Authenticating...']);
      ws.current?.send(token);
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
        console.error('Failed to parse WebSocket message:', event.data, err);
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
