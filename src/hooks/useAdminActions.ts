import { useMutation, useQuery } from 'convex/react';
import { api } from '../lib/convex';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

/**
 * Hook for admin-only actions with proper error handling and authorization
 */
export const useAdminActions = () => {
  const { user, checkAdminStatus } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Admin-only mutations
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createDocument = useMutation(api.files.createDocument);
  const deleteFile = useMutation(api.files.deleteFile);
  const addBulkTrades = useMutation(api.functions.addBulkTrades);
  const deleteAllUserTrades = useMutation(api.functions.deleteAllUserTrades);

  // Admin-only queries
  const getAllUsersTradesSummary = useQuery(
    api.functions.getAllUsersTradesSummary,
    checkAdminStatus() && user?.email ? { userEmail: user.email } : 'skip'
  );

  const isUserAdmin = useQuery(
    api.auth.isUserAdmin,
    user?.email ? { email: user.email } : 'skip'
  );

  /**
   * Generate a secure upload URL for files (Admin only)
   */
  const getUploadUrl = async (): Promise<string> => {
    if (!checkAdminStatus()) {
      throw new Error('Admin access required for file uploads');
    }

    if (!user?.email) {
      throw new Error('User email not available');
    }

    try {
      return await generateUploadUrl({ userEmail: user.email });
    } catch (error) {
      console.error('Failed to generate upload URL:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate upload URL');
    }
  };

  /**
   * Upload a file and create a document record (Admin only)
   */
  const uploadFile = async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ documentId: string; storageId: string }> => {
    if (!checkAdminStatus()) {
      throw new Error('Admin access required for file uploads');
    }

    if (!user?.email) {
      throw new Error('User email not available');
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Get upload URL
      const uploadUrl = await getUploadUrl();

      // Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error('File upload failed');
      }

      const { storageId } = await result.json();

      // Create document record
      const documentId = await createDocument({
        userEmail: user.email,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storageId,
      });

      return { documentId, storageId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Delete a file from storage (Admin only)
   */
  const deleteFileFromStorage = async (storageId: string): Promise<void> => {
    if (!checkAdminStatus()) {
      throw new Error('Admin access required for file deletion');
    }

    if (!user?.email) {
      throw new Error('User email not available');
    }

    try {
      await deleteFile({ storageId, userEmail: user.email });
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete file');
    }
  };

  /**
   * Add multiple trades in bulk (Admin only)
   */
  const addTradesInBulk = async (trades: any[]): Promise<string[]> => {
    if (!checkAdminStatus()) {
      throw new Error('Admin access required for bulk trade operations');
    }

    if (!user?.email) {
      throw new Error('User email not available');
    }

    try {
      return await addBulkTrades({ userEmail: user.email, trades });
    } catch (error) {
      console.error('Failed to add trades in bulk:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to add trades');
    }
  };

  /**
   * Delete all trades for a specific user (Admin only)
   */
  const deleteAllTradesForUser = async (targetUserId: string): Promise<number> => {
    if (!checkAdminStatus()) {
      throw new Error('Admin access required for user data deletion');
    }

    if (!user?.email) {
      throw new Error('User email not available');
    }

    try {
      return await deleteAllUserTrades({ userEmail: user.email, targetUserId });
    } catch (error) {
      console.error('Failed to delete user trades:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete user trades');
    }
  };

  /**
   * Get comprehensive admin dashboard data
   */
  const getAdminDashboardData = () => {
    return {
      usersSummary: getAllUsersTradesSummary,
      isLoading: getAllUsersTradesSummary === undefined,
    };
  };

  return {
    // State
    isAdmin: checkAdminStatus(),
    isUploading,
    uploadError,
    
    // File operations
    getUploadUrl,
    uploadFile,
    deleteFile: deleteFileFromStorage,
    
    // Trade operations
    addTradesInBulk,
    deleteAllTradesForUser,
    
    // Dashboard data
    getAdminDashboardData,
    
    // Permissions
    canUploadFiles: checkAdminStatus(),
    canManageTrades: checkAdminStatus(),
    canViewAllUsers: checkAdminStatus(),
  };
};

export default useAdminActions;
