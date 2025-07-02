import * as React from 'react';
import { Box, Typography, Button, Paper, TextField, Divider, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export default function UploadTrades() {
  const [naturalLanguageInput, setNaturalLanguageInput] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [isPdfUploading, setIsPdfUploading] = React.useState(false);
  const [pdfUploadError, setPdfUploadError] = React.useState<string | null>(null);
  const [pdfUploadSuccess, setPdfUploadSuccess] = React.useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handlePdfUpload = async () => {
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

    console.log("Auth Token being sent:", import.meta.env.VITE_XANO_AUTH_TOKEN);

    try {
      const response = await fetch("https://xtwz-brgd-1r1u.n7c.xano.io/api:8GoBSeHO/transaction_documents", {
        method: "POST",
        body: formData,
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_XANO_AUTH_TOKEN}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log("PDF Upload successful:", result);
        setPdfUploadSuccess(true);
        setSelectedFiles([]); // Clear the selected files after successful upload
      } else {
        const errorData = await response.json();
        console.error("PDF Upload failed:", errorData);
        setPdfUploadError(errorData.message || "Failed to upload PDF.");
      }
    } catch (error) {
      console.error("Error during PDF upload:", error);
      setPdfUploadError("An error occurred during upload.");
    } finally {
      setIsPdfUploading(false);
    }
  };

  const handleNaturalLanguageSubmit = () => {
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
            disabled={isPdfUploading}
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
          disabled={selectedFiles.length === 0 || isPdfUploading}
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
      />
      <Button
        variant="contained"
        onClick={handleNaturalLanguageSubmit}
      >
        Submit Trade Details
      </Button>
    </Box>
  );
}
