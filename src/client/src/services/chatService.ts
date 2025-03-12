import api from './api';
import { OllamaChatRequest, OllamaCompletionResponse, MessageRole } from '../types/chat';

// Define a more complete enhanced response type
interface EnhancedOllamaResponse extends OllamaCompletionResponse {
  thinking?: boolean;
  think?: string;
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
  ) => {
    // Create an AbortController to allow cancelling the request
    const abortController = new AbortController();
    let messageQueue = '';
    let thinkQueue = '';
    let isThinking = false;
    let thinkingStartTime: number | undefined;
    let finalThinkingTime: number | undefined;
    
    // Get the auth token for the request
    const userStr = localStorage.getItem('user');
    let authHeader = '';
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData?.accessToken) {
          authHeader = `Bearer ${userData.accessToken}`;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    // Process incoming message chunks to properly handle thinking parts and content parts
    const processMessageContent = (content: string): {
      think: string;
      content: string;
      thinking: boolean;
      hasFinishedThinking: boolean;
      thinkingStartTime?: number;
      thinkingTime?: number;
    } => {
      // Initialize result
      const result = {
        think: thinkQueue,
        content: messageQueue,
        thinking: isThinking,
        hasFinishedThinking: false,
        thinkingStartTime,
        thinkingTime: finalThinkingTime
      };
      
      // Handle think tags
      if (content.includes('<think>')) {
        // Set thinking start time when we first enter thinking state
        if (!isThinking) {
          thinkingStartTime = Date.now();
          // Store in session storage for persistence
          sessionStorage.setItem('thinkingStartTime', thinkingStartTime.toString());
          sessionStorage.removeItem('thinkingTime');
          result.thinkingStartTime = thinkingStartTime;
        }
        
        isThinking = true;
        const startIndex = content.indexOf('<think>') + '<think>'.length;
        let endIndex = -1;
        
        if (content.includes('</think>')) {
          // Complete thinking
          endIndex = content.indexOf('</think>');
          const thinkContent = content.substring(startIndex, endIndex).trim();
          result.think = thinkQueue + thinkContent;
          
          // Extract actual content after thinking
          const contentAfterThinking = content.substring(endIndex + '</think>'.length).trim();
          result.content = messageQueue + contentAfterThinking;
          
          // Calculate thinking time if thinking has finished
          if (thinkingStartTime) {
            finalThinkingTime = Date.now() - thinkingStartTime;
            sessionStorage.setItem('thinkingTime', finalThinkingTime.toString());
            sessionStorage.removeItem('thinkingStartTime');
            result.thinkingTime = finalThinkingTime;
          } else {
            // If we don't have a start time, try to get from sessionStorage
            const storedStartTime = sessionStorage.getItem('thinkingStartTime');
            if (storedStartTime) {
              finalThinkingTime = Date.now() - parseInt(storedStartTime);
              sessionStorage.setItem('thinkingTime', finalThinkingTime.toString());
              sessionStorage.removeItem('thinkingStartTime');
              result.thinkingTime = finalThinkingTime;
            }
          }
          
          isThinking = false;
          result.thinking = false;
          result.hasFinishedThinking = true;
        } else {
          // Partial thinking (only start tag)
          const thinkContent = content.substring(startIndex).trim();
          result.think = thinkQueue + thinkContent;
          result.thinking = true;
        }
      } else if (isThinking) {
        // Continue thinking (no tags in this chunk)
        if (content.includes('</think>')) {
          // End of thinking
          const endIndex = content.indexOf('</think>');
          const thinkContent = content.substring(0, endIndex).trim();
          result.think = thinkQueue + thinkContent;
          
          // Extract actual content after thinking
          const contentAfterThinking = content.substring(endIndex + '</think>'.length).trim();
          result.content = messageQueue + contentAfterThinking;
          
          // Calculate thinking time if thinking has finished
          if (thinkingStartTime) {
            finalThinkingTime = Date.now() - thinkingStartTime;
            sessionStorage.setItem('thinkingTime', finalThinkingTime.toString());
            sessionStorage.removeItem('thinkingStartTime');
            result.thinkingTime = finalThinkingTime;
          } else {
            // If we don't have a start time, try to get from sessionStorage
            const storedStartTime = sessionStorage.getItem('thinkingStartTime');
            if (storedStartTime) {
              finalThinkingTime = Date.now() - parseInt(storedStartTime);
              sessionStorage.setItem('thinkingTime', finalThinkingTime.toString());
              sessionStorage.removeItem('thinkingStartTime');
              result.thinkingTime = finalThinkingTime;
            }
          }
          
          isThinking = false;
          result.thinking = false;
          result.hasFinishedThinking = true;
        } else {
          // Still thinking
          result.think = thinkQueue + content;
          result.thinking = true;
        }
      } else {
        // Normal content (no thinking)
        result.content = messageQueue + content;
        result.thinking = false;
        
        // If we have a calculated thinking time, make sure it's included
        const storedThinkingTime = sessionStorage.getItem('thinkingTime');
        if (storedThinkingTime) {
          result.thinkingTime = parseInt(storedThinkingTime);
        }
      }
      
      // Update global state
      thinkQueue = result.think;
      messageQueue = result.content;
      
      return result;
    };
    
    // Transform message for client consumption
    const transformToMessageWithThinking = (rawData: any): EnhancedOllamaResponse => {
      try {
        if (typeof rawData === 'string') {
          rawData = JSON.parse(rawData);
        }
        
        // Handle case of no message content
        if (!rawData.message?.content) {
          return {
            model: rawData.model || request.model,
            created_at: rawData.created_at || new Date().toISOString(),
            message: {
              role: 'assistant',
              content: messageQueue
            },
            done: !!rawData.done,
            thinking: isThinking,
            think: thinkQueue,
            thinkingStartTime: thinkingStartTime,
            thinkingTime: finalThinkingTime
          };
        }
        
        // Process the message content to separate thinking and content
        const processed = processMessageContent(rawData.message.content);
        
        // Create transformed response
        const response = {
          model: rawData.model || request.model,
          created_at: rawData.created_at || new Date().toISOString(),
          message: {
            role: 'assistant',
            content: processed.content
          },
          done: !!rawData.done,
          thinking: processed.thinking,
          think: processed.think,
          thinkingStartTime: processed.thinkingStartTime,
          thinkingTime: processed.thinkingTime
        };

        // Ensure we always have a thinkingTime value for completed responses with thinking
        if (response.done && response.think && !response.thinking && !response.thinkingTime) {
          const storedThinkingTime = sessionStorage.getItem('thinkingTime');
          if (storedThinkingTime) {
            response.thinkingTime = parseInt(storedThinkingTime);
          } else if (thinkingStartTime) {
            response.thinkingTime = Date.now() - thinkingStartTime;
          }
        }
        
        return response;
      } catch (e) {
        console.error("Error transforming message:", e);
        
        // Return a safe fallback
        return {
          model: request.model,
          created_at: new Date().toISOString(),
          message: {
            role: 'assistant',
            content: messageQueue
          },
          done: false,
          thinking: isThinking,
          think: thinkQueue,
          thinkingStartTime: thinkingStartTime,
          thinkingTime: finalThinkingTime
        };
      }
    };

    // Start the streaming request using fetch with appropriate headers
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
            
            // Skip empty lines and non-data lines
            if (!line || !line.startsWith('data:')) {
              lineEnd = buffer.indexOf('\n');
              continue;
            }
            
            // Extract JSON string
            const jsonStr = line.substring(5).trim(); // Remove 'data:' prefix
            
            try {
              const data = JSON.parse(jsonStr);
              
              // Check for errors
              if (data.error) {
                onError(new Error(data.error));
                return;
              }
              
              // Transform and send the message
              const transformedMessage = transformToMessageWithThinking(data);
              onMessage(transformedMessage);
              
              // Handle completion
              if (data.done) {
                // Send final message
                const finalMessage: EnhancedOllamaResponse = {
                  ...transformedMessage,
                  done: true
                };
                onMessage(finalMessage);
                return;
              }
            } catch (e) {
              console.warn("Error parsing SSE message:", e);
              // Continue processing - don't break on parse errors
            }
            
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

    // Return a function to abort the stream
    return () => {
      abortController.abort();
    };
  }
};

export default chatService;
