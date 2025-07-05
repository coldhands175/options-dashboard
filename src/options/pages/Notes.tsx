import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
  Alert,
  Stack,
  Divider,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Note as NoteIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { memApiService } from '../../services/memApi';
import '../../tiptap.css';

interface TradeNote {
  id: string;
  content: string;
  created_at: string;
  type: 'trade' | 'analysis' | 'idea';
  success?: boolean;
}

export default function Notes() {
  const [savedNotes, setSavedNotes] = useState<TradeNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Type "/" for quick actions...\n\nQuick templates:\n• /long - Long position template\n• /short - Short position template\n• /analysis - Market analysis template\n• /idea - Trade idea template'
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  useEffect(() => {
    // Load saved notes from localStorage
    const saved = localStorage.getItem('trade-notes');
    if (saved) {
      try {
        setSavedNotes(JSON.parse(saved));
      } catch (err) {
        console.error('Error loading saved notes:', err);
      }
    }
  }, []);

  const insertTemplate = (template: string) => {
    if (!editor) return;
    
    const templates = {
      long: `
📈 **LONG POSITION**

**Symbol:** 
**Entry Price:** $
**Target:** $
**Stop Loss:** $
**Size:** 
**Reason:** 

**Notes:**
`,
      short: `
📉 **SHORT POSITION**

**Symbol:** 
**Entry Price:** $
**Target:** $
**Stop Loss:** $
**Size:** 
**Reason:** 

**Notes:**
`,
      analysis: `
📊 **MARKET ANALYSIS**

**Date:** ${new Date().toLocaleDateString()}
**Market Conditions:** 
**Key Levels:** 
**Trend:** 
**Sentiment:** 

**Analysis:**
`,
      idea: `
💡 **TRADE IDEA**

**Symbol:** 
**Setup:** 
**Timeframe:** 
**Confidence:** /10
**Risk/Reward:** 

**Thesis:**
`
    };

    editor.commands.insertContent(templates[template as keyof typeof templates]);
    editor.commands.focus();
  };

  const handleSaveNote = async () => {
    if (!editor) return;
    
    const content = editor.getText().trim();
    if (!content) {
      setError('Please enter some content before saving.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Create note in Mem
      await memApiService.createNote({ 
        content: editor.getHTML(),
        title: `Trade Note - ${new Date().toLocaleDateString()}`
      });

      // Save locally for display
      const newNote: TradeNote = {
        id: Date.now().toString(),
        content: editor.getHTML(),
        created_at: new Date().toISOString(),
        type: content.includes('LONG POSITION') ? 'trade' : 
              content.includes('SHORT POSITION') ? 'trade' :
              content.includes('MARKET ANALYSIS') ? 'analysis' : 'idea'
      };

      const updatedNotes = [newNote, ...savedNotes];
      setSavedNotes(updatedNotes);
      localStorage.setItem('trade-notes', JSON.stringify(updatedNotes));

      // Clear editor
      editor.commands.clearContent();
      setSuccess('Note saved to Mem successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save note. Please try again.');
      console.error('Error saving note:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trade':
        return <TrendingUpIcon color="primary" />;
      case 'analysis':
        return <TimelineIcon color="secondary" />;
      default:
        return <NoteIcon color="action" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NoteIcon color="primary" />
            Trade Notes
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Quick note-taking for your trades. Notes are automatically synced to your Mem account.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}
        </Grid>

        {/* Rich Text Editor */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Note Editor
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<TrendingUpIcon />}
                    onClick={() => insertTemplate('long')}
                  >
                    Long Position
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<TrendingDownIcon />}
                    onClick={() => insertTemplate('short')}
                  >
                    Short Position
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<TimelineIcon />}
                    onClick={() => insertTemplate('analysis')}
                  >
                    Analysis
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<NoteIcon />}
                    onClick={() => insertTemplate('idea')}
                  >
                    Trade Idea
                  </Button>
                </Stack>
              </Box>
              
              <Box 
                sx={{ 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1,
                  minHeight: 300,
                  '& .ProseMirror': {
                    outline: 'none',
                    padding: 2,
                    minHeight: 250,
                  },
                  '& .ProseMirror p.is-editor-empty:first-child::before': {
                    color: '#adb5bd',
                    content: 'attr(data-placeholder)',
                    float: 'left',
                    height: 0,
                    pointerEvents: 'none',
                  }
                }}
              >
                <EditorContent editor={editor} />
              </Box>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleSaveNote}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
                >
                  Save to Mem
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Notes */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Notes ({savedNotes.length})
              </Typography>
              
              {savedNotes.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <NoteIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No notes yet. Create your first trade note!
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2} sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {savedNotes.slice(0, 10).map((note) => (
                    <Box key={note.id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        {getTypeIcon(note.type)}
                        <Chip label={note.type} size="small" variant="outlined" />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(note.created_at)}
                        </Typography>
                      </Stack>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
