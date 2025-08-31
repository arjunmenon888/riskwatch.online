// filepath: frontend/src/pages/dashboards/NewsFetcherPage.tsx
import React, { useState, useRef, useEffect, type FormEvent } from 'react';
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { type FetchStatus } from '../../types/news.ts';

const NewsFetcherPage: React.FC = () => {
  const [limit, setLimit] = useState<number>(10);
  const [customSite, setCustomSite] = useState<string>('');
  const [siteList, setSiteList] = useState<string[]>([]);
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

  const addSite = () => {
    if (customSite && !siteList.includes(customSite)) {
      setSiteList([...siteList, customSite]);
      setCustomSite('');
    }
  };

  const removeSite = (siteToRemove: string) => {
    setSiteList(siteList.filter((site) => site !== siteToRemove));
  };

  const handleStartFetch = (e: FormEvent) => {
    e.preventDefault();
    if (isFetching) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLogs(['Authentication token not found. Please log in again.']);
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//localhost:8000/api/v1/superadmin/fetch-news`;

    ws.current = new WebSocket(wsUrl);
    setIsFetching(true);
    setLogs(['Connecting to fetcher service...']);
    setStatus({ stage: 'Connecting', progress: 0, message: 'Initiating connection...', is_complete: false });

    ws.current.onopen = () => {
      setLogs((prev) => [...prev, 'Connection established. Authenticating...']);
      ws.current?.send(token);
      
      setLogs((prev) => [...prev, 'Sending fetch command...']);
      ws.current?.send(JSON.stringify({ limit, custom_sites: siteList }));
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

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Prevent NaN by defaulting to 1 if the field is cleared
    const numValue = value === '' ? 1 : parseInt(value, 10);
    setLimit(numValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>News Fetcher</Typography>
      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleStartFetch}>
          <Typography variant="h6">Configuration</Typography>
          <TextField
            label="Max Articles to Fetch"
            type="number"
            value={limit}
            onChange={handleLimitChange}
            fullWidth
            margin="normal"
            disabled={isFetching}
            InputProps={{ inputProps: { min: 1, max: 100 } }}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Add Custom Site (RSS or HTML)"
              value={customSite}
              onChange={(e) => setCustomSite(e.target.value)}
              fullWidth
              margin="normal"
              disabled={isFetching}
            />
            <Button onClick={addSite} variant="outlined" disabled={isFetching || !customSite}>Add</Button>
          </Box>
          {siteList.length > 0 && (
            <List dense>
              {siteList.map((site) => (
                <ListItem key={site} secondaryAction={
                  <IconButton edge="end" onClick={() => removeSite(site)} disabled={isFetching}>
                    <DeleteIcon />
                  </IconButton>
                }>
                  <ListItemText primary={site} />
                </ListItem>
              ))}
            </List>
          )}
          <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }} disabled={isFetching}>
            {isFetching ? 'Fetching...' : 'Start Fetch'}
          </Button>
        </Box>
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