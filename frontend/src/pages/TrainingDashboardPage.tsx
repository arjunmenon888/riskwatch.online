// filepath: frontend/src/pages/TrainingDashboardPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Button,
  LinearProgress,
  Divider,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DoneAllIcon from '@mui/icons-material/DoneAll';

import apiClient from '../api/apiClient.ts';
import { type Training, type Lesson } from '../types/training.ts';
import { type ProgressData } from '../types/progress.ts';

const TrainingDashboardPage: React.FC = () => {
  const { trainingId } = useParams<{ trainingId: string }>();

  // State
  const [training, setTraining] = useState<Training | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);

  // Fetch initial data (training content and user progress)
  useEffect(() => {
    if (!trainingId) return;

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [trainingResponse, progressResponse] = await Promise.all([
          apiClient.get<Training>(`/trainings/${trainingId}`),
          apiClient.get<ProgressData>(`/progress/${trainingId}`),
        ]);
        setTraining(trainingResponse.data);
        setProgress(progressResponse.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load training data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [trainingId]);
  
  // "Resume" logic: Once data is loaded, find the next lesson and set the state
  useEffect(() => {
    if (!training || !progress) return;

    if (progress.next_lesson_id) {
      let found = false;
      for (let mIdx = 0; mIdx < training.modules.length; mIdx++) {
        const lIdx = training.modules[mIdx].lessons.findIndex(
          l => l.id === progress.next_lesson_id
        );
        if (lIdx !== -1) {
          setCurrentModuleIndex(mIdx);
          setCurrentLessonIndex(lIdx);
          found = true;
          break;
        }
      }
      // If next lesson is not found (data inconsistency), or if all completed, go to last lesson
      if (!found && training.modules.length > 0) {
        const lastModuleIndex = training.modules.length - 1;
        const lastLessonIndex = training.modules[lastModuleIndex].lessons.length - 1;
        setCurrentModuleIndex(lastModuleIndex);
        setCurrentLessonIndex(Math.max(0, lastLessonIndex));
      }
    }
  }, [training, progress]);

  // Derived state for easier access
  const { currentLesson, isLastLessonInModule, isLastModule, progressPercentage, isTrainingComplete } = useMemo(() => {
    if (!training || training.modules.length === 0) {
      return {
        currentLesson: null, isLastLessonInModule: false, isLastModule: false, progressPercentage: 0, isTrainingComplete: true
      };
    }
    const currentModule = training.modules[currentModuleIndex];
    const lesson = currentModule?.lessons[currentLessonIndex] ?? null;

    const totalLessons = progress?.total_lessons ?? 1;
    const completedCount = progress?.completed_lessons_count ?? 0;
    
    return {
      currentLesson: lesson,
      isLastLessonInModule: currentLessonIndex === (currentModule?.lessons.length - 1),
      isLastModule: currentModuleIndex === (training.modules.length - 1),
      progressPercentage: totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0,
      isTrainingComplete: completedCount === totalLessons && totalLessons > 0,
    };
  }, [training, progress, currentModuleIndex, currentLessonIndex]);

  // Handler for the "Next" button
  const handleNext = async () => {
    if (!currentLesson || !training) return;

    // Save progress for the current lesson
    try {
      if (!progress?.completed_lesson_ids.includes(currentLesson.id)) {
        await apiClient.post('/progress', { lesson_id: currentLesson.id });
        setProgress(prev => prev ? ({ 
          ...prev, 
          completed_lesson_ids: [...prev.completed_lesson_ids, currentLesson.id],
          completed_lessons_count: prev.completed_lessons_count + 1,
         }) : null);
      }
    } catch (err) {
      alert("Could not save progress. Please try again.");
      return;
    }

    // Navigate to the next lesson or module
    if (!isLastLessonInModule) {
      setCurrentLessonIndex(prev => prev + 1);
    } else if (!isLastModule) {
      setCurrentModuleIndex(prev => prev + 1);
      setCurrentLessonIndex(0);
    }
  };

  // --- RENDER LOGIC ---

  if (isLoading) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  if (error) {
    return <Container><Alert severity="error" sx={{ mt: 4 }}>{error}</Alert></Container>;
  }

  if (!training || !currentLesson) {
    return <Container><Alert severity="info" sx={{ mt: 4 }}>This training has no content.</Alert></Container>;
  }

  const videoAttachment = currentLesson.attachments.find(att => att.mime_type.startsWith('video/'));

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>{training.title}</Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 400 }}>{training.description}</Typography>

      <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h5" sx={{ mb: 1 }}>{training.modules[currentModuleIndex].title}</Typography>
          <Divider />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2, mb: 2 }}>{currentLesson.title}</Typography>

          {currentLesson.content && (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
              {currentLesson.content}
            </Typography>
          )}

          {videoAttachment && (
            <Box
              component="video"
              controls
              src={videoAttachment.public_url}
              sx={{ width: '100%', borderRadius: 2, backgroundColor: 'black', mb: 3 }}
            />
          )}
        </Box>
        
        <Box sx={{ p: { xs: 2, sm: 4 }, pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LinearProgress variant="determinate" value={progressPercentage} sx={{ flexGrow: 1, height: 8, borderRadius: 4 }} />
                <Typography variant="body2" color="text.secondary">{Math.round(progressPercentage)}%</Typography>
            </Box>

            {isTrainingComplete ? (
              <Button variant="contained" color="success" startIcon={<DoneAllIcon />} disabled>
                Training Complete!
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext} endIcon={<NavigateNextIcon />}>
                {isLastLessonInModule && isLastModule ? 'Finish Training' : (isLastLessonInModule ? 'Next Module' : 'Next Lesson')}
              </Button>
            )}
        </Box>
      </Paper>
    </Container>
  );
};

export default TrainingDashboardPage;