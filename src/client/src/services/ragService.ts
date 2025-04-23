import api from './api';
import { RagResponse, RAGBuildIndexResponse } from '../types/chat';

// API endpoints for RAG service
const RAG_ENDPOINTS = {
  CHAT: '/api/rag/chat',
  HEALTH: '/api/rag/health',
  BUILD_INDEX: '/api/rag/build-index',
  STATUS: '/api/rag/status'
};

/**
 * Send a RAG query about Vietnamese traffic laws
 * @param query User's question about traffic laws
 * @returns Promise with the RAG response
 */
export const sendRagQuery = async (query: string): Promise<RagResponse> => {
  try {
    const response = await api.post(RAG_ENDPOINTS.CHAT, { query });
    return response.data;
  } catch (error) {
    console.error('Error sending RAG query:', error);
    throw error;
  }
};

/**
 * Build or rebuild the vector database index
 * @returns Promise with the build status
 */
export const buildRagIndex = async (): Promise<RAGBuildIndexResponse> => {
  try {
    const response = await api.post(RAG_ENDPOINTS.BUILD_INDEX);
    return response.data;
  } catch (error) {
    console.error('Error building RAG index:', error);
    throw error;
  }
};

/**
 * Get status of the RAG vector database
 * @returns Promise with the status information
 */
export const getRagStatus = async (): Promise<any> => {
  try {
    const response = await api.get(RAG_ENDPOINTS.STATUS);
    return response.data;
  } catch (error) {
    console.error('Error getting RAG status:', error);
    throw error;
  }
};

/**
 * Check the health of the RAG service
 * @returns Promise with the health status
 */
export const checkRagHealth = async (): Promise<{ status: string }> => {
  try {
    const response = await api.get(RAG_ENDPOINTS.HEALTH);
    return response.data;
  } catch (error) {
    console.error('Error checking RAG health:', error);
    throw error;
  }
};

export default {
  sendRagQuery,
  checkRagHealth,
  buildRagIndex,
  getRagStatus
};