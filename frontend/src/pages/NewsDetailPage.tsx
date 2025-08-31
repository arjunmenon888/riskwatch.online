// filepath: frontend/src/pages/NewsDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Button,
  Link as MuiLink,
  Breadcrumbs,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import HomeIcon from '@mui/icons-material/Home';
import apiClient from '../api/apiClient.ts';
import { type Post } from '../types/news.ts';
import useAuth from '../hooks/useAuth.ts';
import NotFoundPage from './NotFoundPage.tsx';

const NewsDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get<Post>(`/posts/${postId}`);
      setPost(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('404'); // Special case for Not Found
      } else {
        setError('Failed to fetch the news article. It may have been removed or the server is unavailable.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleDelete = async () => {
    if (!post || user?.role !== 'superadmin') return;
    if (window.confirm('Are you sure you want to permanently delete this post?')) {
      try {
        await apiClient.delete(`/posts/${post.id}`);
        navigate('/home');
      } catch (err) {
        alert('Failed to delete the post.');
      }
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error === '404' || !post) {
    return <NotFoundPage />;
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
      </Container>
    );
  }
  
  // The post.image_url from the API is now the complete, public URL from Cloudflare R2.
  // No need to prepend the API base URL.

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <MuiLink
          component={RouterLink}
          underline="hover"
          color="inherit"
          to="/home"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Home
        </MuiLink>
        <Typography color="text.primary">News</Typography>
      </Breadcrumbs>

      <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          {post.title}
        </Typography>

        <Box
          component="img"
          src={post.image_url} // Use the URL directly
          alt={post.title}
          sx={{
            width: '100%',
            maxHeight: '450px',
            objectFit: 'cover',
            borderRadius: 2,
            my: 3,
            backgroundColor: 'action.hover', // Placeholder color while image loads
          }}
        />

        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', my: 3, lineHeight: 1.7 }}>
          {post.description}
        </Typography>

        <Box
          sx={{
            mt: 4,
            p: 2,
            backgroundColor: 'action.hover',
            borderRadius: 1,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            ➤ Source:{' '}
            <MuiLink href={post.source_url} target="_blank" rel="noopener noreferrer">
              {post.source_name}
            </MuiLink>
          </Typography>

          {user?.role === 'superadmin' && (
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
              Delete Post
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default NewsDetailPage;