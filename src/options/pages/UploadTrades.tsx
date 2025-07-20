import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Box, Typography, Button, Paper, TextField, Divider, CircularProgress, 
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  Accordion, AccordionSummary, AccordionDetails, Chip, Alert
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { convexApi, ConvexApiError } from '../../services/convexApi';
import { useAuth } from '../../hooks/useAuth';

export default function UploadTrades() {
  const { isAdmin, checkAdminAccess } = useAuth();
  
  // State hooks must be called before any conditional returns
  const [naturalLanguageInput, setNaturalLanguageInput] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [isPdfUploading, setIsPdfUploading] = React.useState(false);
  const [pdfUploadError, setPdfUploadError] = React.useState<string | null>(null);
  const [pdfUploadSuccess, setPdfUploadSuccess] = React.useState(false);
  const [processor, setProcessor] = React.useState<'gemini' | 'claude'>('claude');
  const [processingResults, setProcessingResults] = React.useState<any[]>([]);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  
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
    setSuccessMessage(null);

    try {
      // Use a default user ID for now (until proper auth is implemented)
      const userId = 'current-user-' + Date.now();
      
      console.log(`Uploading ${selectedFiles.length} file(s) to Convex...`);
      
      const results = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        console.log(`Processing file ${i + 1}/${selectedFiles.length}: ${file.name}`);
        
        try {
          // Upload file to Convex storage and create document record
          const { documentId, storageId } = await convexApi.uploadDocument(file, userId);
          console.log(`File ${i + 1} uploaded successfully. Document ID: ${documentId}`);
          
          // Process document with selected AI processor
          console.log(`Processing document ${documentId} with ${processor.toUpperCase()} API...`);
          const processResult = await convexApi.processDocument(documentId, userId, storageId, processor);
          
          results.push({
            fileName: file.name,
            documentId,
            extractedTrades: processResult.extractedTradesCount,
            totalTrades: processResult.totalTrades,
            errors: processResult.errors,
            processor,
            documentClassification: processResult.documentClassification,
            success: true
          });
          
          console.log(`File ${i + 1} processed successfully. Extracted ${processResult.extractedTradesCount} trades.`);
          
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          results.push({
            fileName: file.name,
            error: fileError instanceof Error ? fileError.message : 'Unknown error',
            processor,
            success: false
          });
        }
        
        // Small delay between files
        if (i < selectedFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Show results summary
      const successCount = results.filter(r => !r.error).length;
      const totalTrades = results.reduce((sum, r) => sum + (r.extractedTrades || 0), 0);
      
      console.log(`Processing complete: ${successCount}/${selectedFiles.length} files processed successfully. Total trades extracted: ${totalTrades}`);
      
      // Store detailed results
      setProcessingResults(results);
      
      if (successCount > 0) {
        setPdfUploadSuccess(true);
        // Clear any previous errors on success
        setPdfUploadError(null);
        // Set success message
        setSuccessMessage(totalTrades > 0 ? 
          `Success! Processed ${successCount} file(s) and extracted ${totalTrades} trades.` : 
          `Files processed successfully. ${totalTrades === 0 ? 'No options trades found in the documents.' : ''}`
        );
      } else {
        setPdfUploadError('All file processing failed. Please check the files and try again.');
      }
      
      setSelectedFiles([]);
      
    } catch (error) {
      console.error("Error during PDF upload:", error);
      if (error instanceof ConvexApiError) {
        setPdfUploadError(error.message);
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

      {/* AI Processor Selection */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
        <FormControl component="fieldset">
          <FormLabel component="legend">
            <Typography variant="h6" sx={{ mb: 1 }}>
              🤖 Choose AI Processor
            </Typography>
          </FormLabel>
          <RadioGroup
            row
            value={processor}
            onChange={(e) => setProcessor(e.target.value as 'gemini' | 'claude')}
          >
            <FormControlLabel 
              value="claude" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesomeIcon color="primary" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">Claude Sonnet 4</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Superior reasoning • Better trade classification • Document analysis
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel 
              value="gemini" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SmartToyIcon color="secondary" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">Gemini 1.5 Flash</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fast processing • Cost effective • Good accuracy
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </Paper>

      {/* PDF Upload Section */}
      <Typography variant="h6" component="h2" sx={{ mt: 2, mb: 2 }}>
        Upload PDF Trade Statements
      </Typography>
      <Typography variant="body1" paragraph>
        Upload your PDF trade transaction documents here. The system will process them to extract trade records using {processor === 'claude' ? 'Claude Sonnet 4' : 'Gemini 1.5 Flash'}.
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
        {successMessage && (
          <Typography variant="body2" color="success.main" mt={1} fontWeight="bold">
            {successMessage}
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
          startIcon={processor === 'claude' ? <AutoAwesomeIcon /> : <SmartToyIcon />}
        >
          {isPdfUploading ? <CircularProgress size={24} /> : `Process with ${processor === 'claude' ? 'Claude' : 'Gemini'}`}
        </Button>
      </Paper>

      {/* Processing Results */}
      {processingResults.length > 0 && (
        <>
          <Typography variant="h6" component="h2" sx={{ mt: 4, mb: 2 }}>
            📊 Processing Results
          </Typography>
          {processingResults.map((result, index) => (
            <Accordion key={index} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant="body1" fontWeight="bold">
                    {result.fileName}
                  </Typography>
                  <Chip 
                    label={result.processor === 'claude' ? 'Claude' : 'Gemini'}
                    color={result.processor === 'claude' ? 'primary' : 'secondary'}
                    size="small"
                  />
                  <Chip 
                    label={result.success ? `${result.extractedTrades || 0} trades` : 'Error'}
                    color={result.success ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {result.success ? (
                  <Box>
                    {/* Document Classification */}
                    {result.documentClassification && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight="bold">Document Analysis:</Typography>
                        <Typography variant="body2">
                          <strong>Type:</strong> {result.documentClassification.type?.replace(/_/g, ' ') || 'Unknown'} • 
                          <strong>Broker:</strong> {result.documentClassification.broker?.replace(/_/g, ' ') || 'Unknown'} • 
                          <strong>Confidence:</strong> {result.documentClassification.confidence ? (result.documentClassification.confidence * 100).toFixed(1) + '%' : 'N/A'}
                        </Typography>
                        {result.documentClassification.dateRange && (
                          <Typography variant="body2">
                            <strong>Period:</strong> {result.documentClassification.dateRange.startDate} to {result.documentClassification.dateRange.endDate}
                          </Typography>
                        )}
                        {result.documentClassification.notes && (
                          <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                            {result.documentClassification.notes}
                          </Typography>
                        )}
                      </Alert>
                    )}
                    
                    {/* Trade Extraction Results */}
                    <Typography variant="body1" gutterBottom>
                      <strong>Extracted Trades:</strong> {result.extractedTrades || 0} out of {result.totalTrades || 0} total
                    </Typography>
                    
                    {result.errors && result.errors.length > 0 && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        <Typography variant="body2" fontWeight="bold">Processing Notes:</Typography>
                        {result.errors.map((error: string, i: number) => (
                          <Typography key={i} variant="body2" component="div">
                            • {error}
                          </Typography>
                        ))}
                      </Alert>
                    )}
                    
                    {result.extractedTrades === 0 && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          No options trades found in this document. This could mean:
                        </Typography>
                        <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                          • The document contains only stock/equity trades
                          • The document is a different type (portfolio summary, tax document, etc.)
                          • Options trades are in a format not yet supported
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                ) : (
                  <Alert severity="error">
                    <Typography variant="body2" fontWeight="bold">Processing Error:</Typography>
                    <Typography variant="body2">{result.error}</Typography>
                  </Alert>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}

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
