import api from './api';
import { OllamaChatRequest, OllamaCompletionResponse } from '../types/chat';

// Define a more complete enhanced response type
interface EnhancedOllamaResponse extends OllamaCompletionResponse {
  thinking?: boolean;
  think?: string;
  thinkingStartTime?: number;
  thinkingTime?: number;
}

// Type for the internal thinking state
interface ThinkingState {
  messageQueue: string;
  thinkQueue: string;
  isThinking: boolean;
  startTimestamp?: string;
  endTimestamp?: string;
  clientSideStartTime?: number;
}

// Result of processing a message chunk
interface ProcessedMessageContent {
  think: string;
  content: string;
  thinking: boolean;
  hasFinishedThinking: boolean;
  thinkingStartTime?: number;
  thinkingTime?: number;
}

const chatService = {
  generateCompletion: async (request: OllamaChatRequest): Promise<OllamaCompletionResponse> => {
    const response = await api.post<OllamaCompletionResponse>('/api/ollama/chat', request);
    return response.data;
  },
  
  streamCompletion: (
    request: OllamaChatRequest, 
    onMessage: (data: EnhancedOllamaResponse) => void, 
    onError: (error: Error) => void
  ): (() => void) => {
    // Create an AbortController to allow cancelling the request
    const abortController = new AbortController();
    
    // Initialize thinking state
    const thinkingState: ThinkingState = {
      messageQueue: '',
      thinkQueue: '',
      isThinking: false,
    };
    
    // Get auth token for the request
    const authHeader = getAuthHeader();
    
    // Start the streaming request
    startStreamingRequest(request, thinkingState, onMessage, onError, abortController, authHeader);
    
    // Return a function to abort the stream
    return () => abortController.abort();
  }
};

// Helper function to get the auth header
function getAuthHeader(): string {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return '';
    
    const userData = JSON.parse(userStr);
    return userData?.accessToken ? `Bearer ${userData.accessToken}` : '';
  } catch (error) {
    console.error('Error parsing user data:', error);
    return '';
  }
}

// Process incoming message chunks to properly handle thinking parts and content parts
function processMessageContent(
  content: string, 
  timestamp: string,
  state: ThinkingState
): ProcessedMessageContent {
  // Initialize result with current state
  const result: ProcessedMessageContent = {
    think: state.thinkQueue,
    content: state.messageQueue,
    thinking: state.isThinking,
    hasFinishedThinking: false,
    thinkingStartTime: state.clientSideStartTime,
    thinkingTime: undefined
  };
  
  // Case 1: Content contains opening think tag
  if (content.includes('<think>')) {
    // Set thinking start timestamp when we first enter thinking state
    if (!state.isThinking) {
      state.startTimestamp = timestamp;
      state.clientSideStartTime = Date.now();
      result.thinkingStartTime = state.clientSideStartTime;
    }
    
    state.isThinking = true;
    const startIndex = content.indexOf('<think>') + '<think>'.length;
    
    // Case 1.1: Contains both opening and closing think tags
    if (content.includes('</think>')) {
      const endIndex = content.indexOf('</think>');
      const thinkContent = content.substring(startIndex, endIndex).trim();
      result.think = state.thinkQueue + thinkContent;
      
      // Extract actual content after thinking
      const contentAfterThinking = content.substring(endIndex + '</think>'.length).trim();
      result.content = state.messageQueue + contentAfterThinking;
      
      // Record thinking end timestamp and calculate duration
      state.endTimestamp = timestamp;
      result.thinkingTime = calculateThinkingTime(state);
      
      state.isThinking = false;
      result.thinking = false;
      result.hasFinishedThinking = true;
      state.clientSideStartTime = undefined;
    } 
    // Case 1.2: Only opening think tag
    else {
      const thinkContent = content.substring(startIndex).trim();
      result.think = state.thinkQueue + thinkContent;
      result.thinking = true;
    }
  } 
  // Case 2: Currently thinking but no opening tag (continuing from previous chunk)
  else if (state.isThinking) {
    // Case 2.1: Closing think tag found
    if (content.includes('</think>')) {
      const endIndex = content.indexOf('</think>');
      const thinkContent = content.substring(0, endIndex).trim();
      result.think = state.thinkQueue + thinkContent;
      
      // Extract actual content after thinking
      const contentAfterThinking = content.substring(endIndex + '</think>'.length).trim();
      result.content = state.messageQueue + contentAfterThinking;
      
      // Record thinking end timestamp and calculate duration
      state.endTimestamp = timestamp;
      result.thinkingTime = calculateThinkingTime(state);
      
      state.isThinking = false;
      result.thinking = false;
      result.hasFinishedThinking = true;
      state.clientSideStartTime = undefined;
    } 
    // Case 2.2: Still thinking
    else {
      result.think = state.thinkQueue + content;
      result.thinking = true;
    }
  } 
  // Case 3: Not thinking
  else {
    // Case 3.1: Contains closing think tag without opening (can happen if opening was in previous chunk)
    if (content.includes('</think>')) {
      const endIndex = content.indexOf('</think>');
      const thinkContent = content.substring(0, endIndex).trim();
      
      if (state.thinkQueue) {
        result.think = state.thinkQueue + thinkContent;
      }
      
      // Extract content after thinking
      const contentAfterThinking = content.substring(endIndex + '</think>'.length).trim();
      result.content = state.messageQueue + contentAfterThinking;
      
      // Record thinking end timestamp and calculate duration
      state.endTimestamp = timestamp;
      result.thinkingTime = calculateThinkingTime(state);
      
      result.hasFinishedThinking = true;
      state.clientSideStartTime = undefined;
    } 
    // Case 3.2: Regular content
    else {
      result.content = state.messageQueue + content;
    }
    result.thinking = false;
  }
  
  // Update global state
  state.thinkQueue = result.think;
  state.messageQueue = result.content;
  
  return result;
}

// Calculate thinking time based on timestamps or client timing
function calculateThinkingTime(state: ThinkingState): number | undefined {
  if (state.startTimestamp && state.endTimestamp) {
    const startDate = new Date(state.startTimestamp).getTime();
    const endDate = new Date(state.endTimestamp).getTime();
    return endDate - startDate;
  } else if (state.clientSideStartTime && state.isThinking) {
    // For real-time updates during thinking
    return Date.now() - state.clientSideStartTime;
  } else if (state.clientSideStartTime && state.endTimestamp) {
    // Fallback when thinking has ended but missing start timestamp
    return new Date(state.endTimestamp).getTime() - state.clientSideStartTime;
  }
  return undefined;
}

// Transform raw data into a properly formatted message with thinking info
function transformToMessageWithThinking(
  rawData: any, 
  state: ThinkingState,
  modelId: string
): EnhancedOllamaResponse {
  try {
    // Parse string data if needed
    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    const timestamp = data.created_at || new Date().toISOString();
    
    // Handle case of no message content
    if (!data.message?.content) {
      return {
        model: data.model || modelId,
        created_at: timestamp,
        message: {
          role: 'assistant',
          content: state.messageQueue
        },
        done: !!data.done,
        thinking: state.isThinking,
        think: state.thinkQueue,
        thinkingStartTime: state.clientSideStartTime,
        thinkingTime: calculateThinkingTime(state)
      };
    }
    
    // Detect thinking tags in message content
    const messageContent = data.message.content;
    if (messageContent.includes('<think>') && !state.isThinking) {
      state.startTimestamp = timestamp;
      state.clientSideStartTime = Date.now();
      state.isThinking = true;
    } else if (messageContent.includes('</think>') && state.isThinking) {
      state.endTimestamp = timestamp;
      state.isThinking = false;
    }
    
    // Process the message content
    const processed = processMessageContent(messageContent, timestamp, state);
    
    // Return the transformed message
    return {
      model: data.model || modelId,
      created_at: timestamp,
      message: {
        role: 'assistant',
        content: processed.content
      },
      done: !!data.done,
      thinking: processed.thinking,
      think: processed.think,
      thinkingStartTime: processed.thinkingStartTime ?? state.clientSideStartTime,
      thinkingTime: processed.thinkingTime ?? calculateThinkingTime(state)
    };
  } catch (e) {
    console.error("Error transforming message:", e);
    
    // Return a safe fallback
    return {
      model: modelId,
      created_at: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: state.messageQueue
      },
      done: false,
      thinking: state.isThinking,
      think: state.thinkQueue,
      thinkingStartTime: state.clientSideStartTime,
      thinkingTime: calculateThinkingTime(state)
    };
  }
}

// Process a single line of SSE data
function processEventLine(
  line: string,
  state: ThinkingState,
  modelId: string,
  onMessage: (data: EnhancedOllamaResponse) => void,
  onError: (error: Error) => void
): void {
  // Skip empty lines and non-data lines
  if (!line?.startsWith('data:')) return;
  
  // Extract JSON string
  const jsonStr = line.substring(5).trim(); // Remove 'data:' prefix
  
  try {
    const data = JSON.parse(jsonStr);
    
    // Check for errors
    if (data.error) {
      onError(new Error(data.error));
      return;
    }

    // Update thinking state based on content
    if (data.message?.content) {
      if (data.message.content.includes('<think>') && !state.isThinking) {
        state.startTimestamp = data.created_at;
        state.isThinking = true;
      } else if (data.message.content.includes('</think>') && state.isThinking) {
        state.endTimestamp = data.created_at;
        state.isThinking = false;
      }
    }
    
    // Transform and send the message
    const transformedMessage = transformToMessageWithThinking(data, state, modelId);
    onMessage(transformedMessage);
    
    // Handle completion
    if (data.done) {
      // Send final message with calculated thinking time
      const finalMessage: EnhancedOllamaResponse = {
        ...transformedMessage,
        done: true,
        thinkingTime: calculateThinkingTime(state)
      };
      onMessage(finalMessage);
    }
  } catch (e) {
    console.warn("Error parsing SSE message:", e, jsonStr);
    // Continue processing - don't break on parse errors
  }
}

// Start the streaming request to the Ollama API
function startStreamingRequest(
  request: OllamaChatRequest,
  state: ThinkingState,
  onMessage: (data: EnhancedOllamaResponse) => void,
  onError: (error: Error) => void,
  abortController: AbortController,
  authHeader: string
): void {
  fetch(`${api.defaults.baseURL}/api/ollama/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { 'Authorization': authHeader } : {})
    },
    body: JSON.stringify(request),
    signal: abortController.signal
  })
  .then(async response => {
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }

    // Create a reader for the response body stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is undefined');
    }

    // Set up a decoder for the chunks
    const decoder = new TextDecoder();
    let buffer = ''; // Buffer for incomplete lines

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Decode chunk and append to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process complete lines
        let lineEnd = buffer.indexOf('\n');
        while (lineEnd !== -1) {
          const line = buffer.substring(0, lineEnd).trim();
          buffer = buffer.substring(lineEnd + 1);
          
          processEventLine(line, state, request.model, onMessage, onError);
          
          lineEnd = buffer.indexOf('\n');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Stream reading error:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  })
  .catch(error => {
    if (error.name === 'AbortError') return;
    console.error('Stream request failed:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  });
}

export default chatService;
