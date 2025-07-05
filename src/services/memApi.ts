// Use proxy in development, direct API in production
const MEM_API_BASE_URL = import.meta.env.DEV ? '/api/mem/v2' : 'https://api.mem.ai/v2';
const MEM_API_KEY = import.meta.env.VITE_MEM_API_KEY;

// Validate API key is configured
if (!MEM_API_KEY) {
  console.warn('⚠️ MEM_API_KEY not configured. Notes sync to Mem will be disabled.');
}

export interface MemNote {
  id: string;
  content: string;
  title?: string;
  created_at: string;
  updated_at: string;
  collection_ids?: string[];
}

export interface CreateMemNoteRequest {
  content: string;
  title?: string;
  tags?: string[];
}

export interface UpdateMemNoteRequest {
  content?: string;
  title?: string;
  tags?: string[];
  archived?: boolean;
}

class MemApiService {
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${MEM_API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  // Create note using the mem-it endpoint which works reliably
  async createNote(noteData: CreateMemNoteRequest): Promise<any> {
    if (!MEM_API_KEY) {
      throw new Error('Mem API key not configured. Cannot sync notes to Mem.');
    }

    const response = await fetch(`${MEM_API_BASE_URL}/mem-it`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        input: noteData.title ? `${noteData.title}\n\n${noteData.content}` : noteData.content
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create note: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      id: result.request_id,
      content: noteData.content,
      title: noteData.title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      request_id: result.request_id
    };
  }

  // Since there's no list endpoint, we'll maintain a simple local store
  async getNotes(limit: number = 50, offset: number = 0): Promise<MemNote[]> {
    // For now, return empty array since listing isn't available in the API
    // In a real implementation, you might store created notes locally
    return [];
  }

  // These features require endpoints that may not be available
  async updateNote(id: string, noteData: UpdateMemNoteRequest): Promise<MemNote> {
    throw new Error('Update functionality not available in current Mem API');
  }

  async deleteNote(id: string): Promise<void> {
    throw new Error('Delete functionality not available in current Mem API');
  }

  async searchNotes(query: string, limit: number = 20): Promise<MemNote[]> {
    // Search functionality might not be available
    return [];
  }
}

export const memApiService = new MemApiService();
