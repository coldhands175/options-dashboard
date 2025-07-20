import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// Initialize Convex client
const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL environment variable is required");
}

const convex = new ConvexHttpClient(convexUrl);

export class ConvexApiError extends Error {
  status?: number;
  code?: string;
  
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ConvexApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Convex API service for document processing and trade management
 */
export const convexApi = {
  // Document Processing
  async uploadDocument(file: File, userId: string): Promise<{
    documentId: string;
    storageId: string;
  }> {
    try {
      // Get upload URL from Convex
      const uploadUrl = await convex.mutation(api.files.generateUploadUrl);
      
      // Upload file to Convex storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new ConvexApiError(`File upload failed: ${uploadResponse.statusText}`, uploadResponse.status);
      }

      const { storageId } = await uploadResponse.json();

      // Create document record
      const documentId = await convex.mutation(api.functions.processTradeDocument, {
        userId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storageId,
      });

      return {
        documentId,
        storageId,
      };
    } catch (error) {
      console.error("Document upload failed:", error);
      throw error instanceof ConvexApiError ? error : new ConvexApiError(
        error instanceof Error ? error.message : "Document upload failed"
      );
    }
  },

  async processDocument(documentId: string, userId: string, storageId: string, processor: 'gemini' | 'claude' = 'gemini') {
    try {
      const actionName = processor === 'claude' 
        ? api.claudeDocumentProcessing.processDocumentWithClaude
        : api.documentProcessing.processDocumentWithGemini;
      
      const result = await convex.action(actionName, {
        documentId,
        userId,
        storageId,
      });
      
      return result;
    } catch (error) {
      console.error(`Document processing failed (${processor}):`, error);
      throw error instanceof ConvexApiError ? error : new ConvexApiError(
        error instanceof Error ? error.message : `Document processing failed (${processor})`
      );
    }
  },

  async getDocuments(userId: string) {
    try {
      return await convex.query(api.functions.getDocuments, { userId });
    } catch (error) {
      console.error("Failed to get documents:", error);
      throw error instanceof ConvexApiError ? error : new ConvexApiError(
        error instanceof Error ? error.message : "Failed to get documents"
      );
    }
  },

  // Trade Management
  async addTrade(tradeData: any) {
    try {
      return await convex.mutation(api.functions.addTrade, tradeData);
    } catch (error) {
      console.error("Failed to add trade:", error);
      throw error instanceof ConvexApiError ? error : new ConvexApiError(
        error instanceof Error ? error.message : "Failed to add trade"
      );
    }
  },

  async getTrades(userId: string) {
    try {
      return await convex.query(api.functions.getTrades, { userId });
    } catch (error) {
      console.error("Failed to get trades:", error);
      throw error instanceof ConvexApiError ? error : new ConvexApiError(
        error instanceof Error ? error.message : "Failed to get trades"
      );
    }
  },

  async getPositions(userId: string) {
    try {
      return await convex.query(api.functions.getPositions, { userId });
    } catch (error) {
      console.error("Failed to get positions:", error);
      throw error instanceof ConvexApiError ? error : new ConvexApiError(
        error instanceof Error ? error.message : "Failed to get positions"
      );
    }
  },

  // Natural Language Processing
  async processNaturalLanguageInput(userId: string, input: string) {
    // TODO: Implement natural language processing
    // This could use a similar Gemini API call to extract trades from text
    console.log("Natural language processing not yet implemented:", { userId, input });
    throw new ConvexApiError("Natural language processing not yet implemented");
  },
};
