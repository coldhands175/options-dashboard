import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, TextField, Divider, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { xanoApi, XanoApiError } from '../../services/xanoApi';
import { useAuth } from '../../hooks/useAuth';

export default function UploadTrades() {
  const { isAdmin, checkAdminAccess } = useAuth();
  
  // State hooks must be called before any conditional returns
  const [naturalLanguageInput, setNaturalLanguageInput] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [isPdfUploading, setIsPdfUploading] = React.useState(false);
  const [pdfUploadError, setPdfUploadError] = React.useState<string | null>(null);
  const [pdfUploadSuccess, setPdfUploadSuccess] = React.useState(false);
  
  // Redirect non-admin users to dashboard
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handlePdfUpload = async () => {
    try {
      checkAdminAccess();
    } catch (error: any) {
      setPdfUploadError(error.message);
      return;
    }

    if (selectedFiles.length === 0) {
      setPdfUploadError("Please select at least one PDF file to upload.");
      return;
    }

    setIsPdfUploading(true);
    setPdfUploadError(null);
    setPdfUploadSuccess(false);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("content", file); // Append each file with the key 'content'
    });


    try {
      const result = await xanoApi.uploadTransactionDocuments(formData);
      console.log("PDF Upload successful:", result);
      setPdfUploadSuccess(true);
      setSelectedFiles([]); // Clear the selected files after successful upload
    } catch (error) {
      console.error("Error during PDF upload:", error);
      if (error instanceof XanoApiError && error.code === 'RATE_LIMITED') {
        setPdfUploadError('Too many requests. Please wait a moment before uploading again.');
      } else {
        setPdfUploadError((error as Error).message || "An error occurred during upload.");
      }
    } finally {
      setIsPdfUploading(false);
    }
  };

  const handleNaturalLanguageSubmit = () => {
    try {
      checkAdminAccess();
    } catch (error: any) {
      alert(error.message);
      return;
    }

    if (naturalLanguageInput.trim()) {
      console.log('Submitting natural language input:', naturalLanguageInput);
      // TODO: Implement actual natural language processing and submission to Xano API
      alert('Natural language trade details submitted. (Xano API integration pending)');
      setNaturalLanguageInput(''); // Clear input after submission
    } else {
      alert('Please enter some trade details.');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Upload Trade Documents & Details
      </Typography>

      {/* PDF Upload Section */}
      <Typography variant="h6" component="h2" sx={{ mt: 4, mb: 2 }}>
        Upload PDF Trade Statements
      </Typography>
      <Typography variant="body1" paragraph>
        Upload your PDF trade transaction documents here. The system will process them to extract trade records.
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
          cursor: 'pointer',
          '&:hover': { borderColor: 'primary.main' },
        }}
      >
        <input
          accept="application/pdf"
          style={{ display: "none" }}
          id="upload-button-file"
          multiple
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor="upload-button-file">
        <Button
          variant="contained"
          component="span"
          startIcon={<CloudUploadIcon />}
          disabled={isPdfUploading || !isAdmin}
        >
            {isPdfUploading ? <CircularProgress size={24} /> : "Select PDF File"}
          </Button>
        </label>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          or drag and drop your PDF here
        </Typography>
        {selectedFiles.length > 0 && (
          <Box mt={1}>
            <Typography variant="body2">Selected Files:</Typography>
            <ul>
              {selectedFiles.map((file, index) => (
                <li key={index}>
                  <Typography variant="body2">{file.name}</Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}

        {pdfUploadSuccess && (
          <Typography variant="body2" color="success.main" mt={1}>
            PDF(s) uploaded successfully!
          </Typography>
        )}
        {pdfUploadError && (
          <Typography variant="body2" color="error.main" mt={1}>
            Error: {pdfUploadError}
          </Typography>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handlePdfUpload}
          sx={{ mt: 2 }}
          disabled={selectedFiles.length === 0 || isPdfUploading || !isAdmin}
        >
          {isPdfUploading ? <CircularProgress size={24} /> : "Upload PDF"}
        </Button>
      </Paper>

      <Divider sx={{ my: 5 }} />

      {/* Natural Language Input Section */}
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        Enter Trade Details (Natural Language)
      </Typography>
      <Typography variant="body1" paragraph>
        Alternatively, you can describe your trade transactions in natural language. For example: "Bought 10 shares of AAPL at $150 on Jan 1, 2023."
      </Typography>
      <TextField
        label="Trade Details"
        multiline
        rows={6}
        fullWidth
        variant="outlined"
        value={naturalLanguageInput}
        onChange={(e) => setNaturalLanguageInput(e.target.value)}
        sx={{ mb: 2 }}
        placeholder="e.g., 'Sold 5 TSLA calls, strike $200, expiry 2024-12-20 for $5.50 premium each.'"
        disabled={!isAdmin}
      />
      <Button
        variant="contained"
        onClick={handleNaturalLanguageSubmit}
        disabled={!isAdmin}
      >
        Submit Trade Details
      </Button>
    </Box>
  );
}
