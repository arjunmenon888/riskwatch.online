// filepath: frontend/src/components/superadmin/LessonEditor.tsx
import React, { useState, type ChangeEvent, type DragEvent } from 'react';
import { Box, TextField, Button, Paper, Typography, Link as MuiLink, LinearProgress, Alert, List, ListItem, ListItemText, IconButton } from '@mui/material';
import axios from 'axios';
import { type Lesson, type Attachment } from '../../types/training.ts';
import apiClient from '../../api/apiClient.ts';
import { Delete as DeleteIcon, InsertDriveFile as FileIcon } from '@mui/icons-material';

interface LessonEditorProps {
  lesson: Lesson;
  onUpdate: () => void;
}

interface UploadingFile {
    file: File;
    progress: number;
    error?: string;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const LessonEditor: React.FC<LessonEditorProps> = ({ lesson, onUpdate }) => {
  // --- FIX: Manage the entire lesson state for editing ---
  const [currentLesson, setCurrentLesson] = useState(lesson);
  const [isSaving, setIsSaving] = useState(false);
  
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // --- FIX: Handler to update local state as user types ---
  const handleTextChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentLesson(prev => ({ ...prev, [name]: value }));
  };

  // --- FIX: Implement the save text functionality ---
  const handleSaveText = async () => {
    setIsSaving(true);
    try {
      await apiClient.put(`/trainings/lessons/${lesson.id}`, {
        title: currentLesson.title,
        content: currentLesson.content,
        order: currentLesson.order, // It's good practice to send the order back
      });
      // onUpdate will refresh the parent's state, but we can also update locally for snappiness
      onUpdate(); 
      // You could add a success snackbar here for better UX
    } catch (err) {
      alert('Failed to save lesson details.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesToUpload: UploadingFile[] = Array.from(files).map(file => ({ file, progress: 0 }));
    setUploadingFiles(prev => [...prev, ...filesToUpload]);

    try {
        const metadata = filesToUpload.map(({ file }) => ({ filename: file.name, mime_type: file.type, size: file.size }));
        const { data: presignData } = await apiClient.post('/trainings/generate-upload-urls', { lesson_id: lesson.id, files: metadata });

        const uploadPromises = presignData.map(async (item: any) => {
            const fileToUpload = filesToUpload.find(f => f.file.name === item.filename)?.file;
            if (!fileToUpload) return;
            
            try {
                await axios.put(item.upload_url, fileToUpload, {
                    headers: { 'Content-Type': fileToUpload.type },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1));
                        setUploadingFiles(prev => prev.map(f => f.file.name === item.filename ? { ...f, progress: percentCompleted } : f));
                    },
                });
                await apiClient.post(`/trainings/attachments/${item.attachment_id}/complete-upload`);
            } catch (uploadError) {
                setUploadingFiles(prev => prev.map(f => f.file.name === item.filename ? { ...f, error: 'Upload failed' } : f));
            }
        });

        await Promise.all(uploadPromises);

    } catch (err: any) {
        alert(err.response?.data?.detail || 'Could not prepare files for upload.');
    } finally {
        setUploadingFiles([]);
        onUpdate();
    }
  };

  const handleDelete = async (attachmentId: number) => {
    if (window.confirm("Are you sure you want to delete this attachment?")) {
        try {
            await apiClient.delete(`/trainings/attachments/${attachmentId}`);
            onUpdate();
        } catch (err) {
            alert('Failed to delete attachment.');
        }
    }
  }

  const handleDragEvents = (e: DragEvent<HTMLDivElement>, isEntering: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(isEntering);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
      handleDragEvents(e, false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFiles(e.dataTransfer.files);
          e.dataTransfer.clearData();
      }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      {/* --- FIX: Use controlled components with value and onChange --- */}
      <TextField 
        label="Lesson Title"
        name="title" 
        value={currentLesson.title}
        onChange={handleTextChange}
        fullWidth
        variant="filled"
        sx={{ mb: 2 }}
      />
      
      {/* --- FIX: Make content field multiline and controlled --- */}
      <TextField 
        label="Lesson Content" 
        name="content"
        value={currentLesson.content || ''} // Handle null value
        onChange={handleTextChange}
        fullWidth
        variant="filled"
        multiline // <-- FIX: Makes it a textarea
        rows={4}      // <-- FIX: Sets the default height
        sx={{ mb: 2 }}
      />
      
      <Button onClick={handleSaveText} size="small" sx={{ mb: 2 }} variant="contained" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Text'}
      </Button>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Attachments</Typography>
        <Box
            onDrop={handleDrop}
            onDragOver={(e) => handleDragEvents(e, true)}
            onDragEnter={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            sx={{
                border: '2px dashed',
                borderColor: isDragging ? 'primary.main' : 'grey.500',
                borderRadius: 1, p: 2, textAlign: 'center', mb: 2, transition: 'border-color 0.2s'
            }}
        >
            <Typography>Drag & drop files here, or</Typography>
            <Button component="label" sx={{ mt: 1 }}>
                Select Files
                <input type="file" hidden multiple onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)} />
            </Button>
        </Box>

        {uploadingFiles.length > 0 && (
            <List dense>
                {uploadingFiles.map(f => (
                    <ListItem key={f.file.name}>
                        <ListItemText primary={f.file.name} secondary={formatBytes(f.file.size)} />
                        {f.error ? <Alert severity='error' sx={{mr:2}}>{f.error}</Alert> : <LinearProgress variant="determinate" value={f.progress} sx={{ width: '50%', mr: 2 }} />}
                    </ListItem>
                ))}
            </List>
        )}
        
        {currentLesson.attachments.length > 0 && (
            <List dense>
                {currentLesson.attachments.map(att => (
                    <ListItem key={att.id} secondaryAction={
                        <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(att.id)}>
                            <DeleteIcon />
                        </IconButton>
                    }>
                        <FileIcon sx={{ mr: 1 }} />
                        <ListItemText 
                            primary={<MuiLink href={att.public_url} target="_blank" rel="noopener">{att.filename}</MuiLink>}
                            secondary={`${formatBytes(att.size)}`} 
                        />
                    </ListItem>
                ))}
            </List>
        )}
      </Box>
    </Paper>
  );
};

export default LessonEditor;