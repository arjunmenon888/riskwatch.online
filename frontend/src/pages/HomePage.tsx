// src/pages/HomePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  CircularProgress,
  Box,
  Alert,
} from '@mui/material';
import apiClient from '../api/apiClient.ts';
import useAuth from '../hooks/useAuth.ts';
import NewsCard from '../components/NewsCard.tsx';
import { type Post } from '../types/news.ts';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiClient.get<Post[]>('/posts');
      setPosts(response.data || []);
    } catch (err) {
      setError('Failed to load the news feed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Only available for superadmin; passed down to the card
  const handleDelete = async (postId: number) => {
    if (user?.role !== 'superadmin') return;
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await apiClient.delete(`/posts/${postId}`);
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } catch (err) {
        alert('Failed to delete the post.');
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        News Feed
      </Typography>

      {isLoading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}

      {error && !isLoading && <Alert severity="error">{error}</Alert>}

      {!isLoading && !error && (
        <Box
          sx={{
            // Responsive 3 / 2 / 1 columns
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 2,                   // same as MUI spacing={2}
            alignItems: 'start',      // prevent stretch artifacts
          }}
        >
          {posts.map((post) => (
            <Box key={post.id} sx={{ minWidth: 0 }}>
              {/* Card height is handled by NewsCard; wrapper keeps grid clean */}
              <NewsCard
                post={post}
                userRole={user?.role}
                onDelete={handleDelete}
              />
            </Box>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default HomePage;
