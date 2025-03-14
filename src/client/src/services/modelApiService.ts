import api from './api';
import { AIModel } from '../components/chat/ModelSelector';

/**
 * Service for interacting with the Ollama model API endpoints
 * This service provides methods for:
 * - listing available models
 * - pulling new models
 * - getting details about specific models
 * - deleting models
 */
const modelApiService = {
  /**
   * List available models
   */
  listModels: async (): Promise<AIModel[]> => {
    const response = await api.get('/api/ollama/models/available');
    return response.data?.models || [];
  },

  /**
   * Pull a model from the Ollama library
   * @param modelName Name of the model to pull (e.g., "llama3:8b")
   * @param insecure Whether to allow insecure connections
   * @returns Status of the pull operation
   */
  pullModel: async (modelName: string, insecure: boolean = false): Promise<{ status: string }> => {
    const response = await api.post('/api/ollama/models/pull', {
      model: modelName,
      insecure,
      stream: false // We don't handle streaming in the UI yet
    });
    return response.data;
  },

  /**
   * Get details about a specific model
   * @param modelName The name of the model to get details for
   */
  getModelDetails: async (modelName: string) => {
    const response = await api.get(`/api/ollama/models/${encodeURIComponent(modelName)}`);
    return response.data;
  },

  /**
   * Delete a model
   * @param modelName The name of the model to delete
   */
  deleteModel: async (modelName: string): Promise<{ message: string }> => {
    const response = await api.delete(`/api/ollama/models/${encodeURIComponent(modelName)}`);
    return response.data;
  }
};

export default modelApiService;
