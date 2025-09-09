// filepath: frontend/src/components/superadmin/ModuleEditor.tsx
import React, { useState, type FormEvent } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, TextField, Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { type Module } from '../../types/training.ts';
import LessonEditor from './LessonEditor.tsx';
import apiClient from '../../api/apiClient.ts';

interface ModuleEditorProps {
  module: Module;
  onUpdate: () => void;
}

const ModuleEditor: React.FC<ModuleEditorProps> = ({ module, onUpdate }) => {
  // State for the "Add Lesson" dialog
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  const handleOpenLessonDialog = () => {
    setIsLessonDialogOpen(true);
  };

  const handleCloseLessonDialog = () => {
    setIsLessonDialogOpen(false);
    setNewLessonTitle(''); // Reset on close
  };

  const handleAddLessonSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;

    try {
      // --- THIS IS THE FIX ---
      // The path must match the full API route: /trainings/modules/{id}/lessons
      await apiClient.post(`/trainings/modules/${module.id}/lessons`, {
        title: newLessonTitle.trim(),
        order: module.lessons.length,
      });
      handleCloseLessonDialog();
      onUpdate(); // Refresh the parent component's data
    } catch (err) {
      alert('Failed to add lesson.');
    }
  };

  return (
    <>
      <Accordion defaultExpanded sx={{ my: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">{module.title}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {module.lessons.map(lesson => (
            <LessonEditor key={lesson.id} lesson={lesson} onUpdate={onUpdate} />
          ))}
          <Button onClick={handleOpenLessonDialog} variant="outlined" sx={{ alignSelf: 'flex-start' }}>
            Add Lesson
          </Button>
        </AccordionDetails>
      </Accordion>

      {/* Add Lesson Dialog */}
      <Dialog open={isLessonDialogOpen} onClose={handleCloseLessonDialog}>
        <Box component="form" onSubmit={handleAddLessonSubmit}>
          <DialogTitle>Add New Lesson to "{module.title}"</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Enter the title for the new lesson. You can add content and attachments later.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="lesson-title"
              label="Lesson Title"
              type="text"
              fullWidth
              variant="standard"
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseLessonDialog}>Cancel</Button>
            <Button type="submit">Add Lesson</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
};

export default ModuleEditor;