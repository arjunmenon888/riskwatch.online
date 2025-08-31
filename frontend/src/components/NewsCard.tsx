// filepath: frontend/src/components/NewsCard.tsx
import React from 'react';
import { Card, CardMedia, CardContent, Typography, CardActions, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link } from 'react-router-dom';
import { type Post } from '../types/news';
import { type UserRole } from '../context/AuthContext';

interface NewsCardProps {
  post: Post;
  userRole?: UserRole;
  onDelete: (postId: number) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ post, userRole, onDelete }) => {
  // The post.image_url from the API is now the complete, public URL from Cloudflare R2.
  // No need to prepend the API base URL.

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component={Link}
        to={`/news/${post.id}`}
        image={post.image_url} // Use the URL directly
        title={post.title}
        sx={{ height: 180, '&:hover': { opacity: 0.9 } }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          gutterBottom
          variant="h6"
          component={Link}
          to={`/news/${post.id}`}
          sx={{
            color: 'text.primary',
            textDecoration: 'none',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            '&:hover': {
              color: 'primary.main',
            },
          }}
        >
          {post.title}
        </Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {post.source_name}
        </Typography>
        {userRole === 'superadmin' && (
          <IconButton
            size="small"
            onClick={() => onDelete(post.id)}
            color="error"
            aria-label={`Delete post titled ${post.title}`}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </CardActions>
    </Card>
  );
};

export default NewsCard;