import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import { useMigration, MigrationResult } from '../utils/migrateData';

export default function DataMigration() {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const { runMigration } = useMigration();

  const handleMigration = async () => {
    setMigrationStatus('running');
    setMigrationResult(null);

    try {
      const result = await runMigration();
      setMigrationResult(result);
      setMigrationStatus(result.success ? 'completed' : 'error');
    } catch (error) {
      setMigrationStatus('error');
      setMigrationResult({
        success: false,
        migratedCount: 0,
        failedCount: 0,
        errors: [(error as Error).message]
      });
    }
  };

  return (
    <Card variant="outlined" sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Data Migration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Migrate your existing trade data from Xano to Convex. This should only be done once after setting up your Convex backend.
        </Typography>

        {migrationStatus === 'idle' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Before proceeding:</strong>
              <br />
              1. Ensure your Convex deployment is set up and running
              <br />
              2. Make sure your VITE_CONVEX_URL is configured in your .env file
              <br />
              3. This migration will copy all trades from Xano to Convex
            </Typography>
          </Alert>
        )}

        {migrationStatus === 'running' && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Migration in progress...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {migrationStatus === 'completed' && migrationResult && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Migration completed successfully!</strong>
              <br />
              Migrated: {migrationResult.migratedCount} trades
              {migrationResult.failedCount > 0 && (
                <>
                  <br />
                  Failed: {migrationResult.failedCount} trades
                </>
              )}
            </Typography>
          </Alert>
        )}

        {migrationStatus === 'error' && migrationResult && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Migration failed</strong>
              <br />
              Migrated: {migrationResult.migratedCount} trades
              <br />
              Failed: {migrationResult.failedCount} trades
              {migrationResult.errors.length > 0 && (
                <>
                  <br />
                  <strong>Errors:</strong>
                  {migrationResult.errors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </>
              )}
            </Typography>
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={handleMigration}
            disabled={migrationStatus === 'running'}
            startIcon={migrationStatus === 'running' ? <CircularProgress size={20} /> : null}
          >
            {migrationStatus === 'running' ? 'Migrating...' : 'Start Migration'}
          </Button>

          {migrationStatus === 'completed' && (
            <Button
              variant="outlined"
              onClick={() => {
                setMigrationStatus('idle');
                setMigrationResult(null);
              }}
            >
              Reset
            </Button>
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
          Note: This component is for development/migration purposes and should be removed in production.
        </Typography>
      </CardContent>
    </Card>
  );
}
