import api from './api';
import { OllamaChatRequest, OllamaCompletionResponse } from '../types/chat';

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
    
    // Store timestamps for thinking calculation
    let thinkStartTimestamp: string | undefined;
    let thinkEndTimestamp: string | undefined;
    let clientSideThinkingStartTime: number | undefined;
    
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
    const processMessageContent = (content: string, timestamp: string): {
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
        thinkingStartTime: clientSideThinkingStartTime,
        thinkingTime: undefined as number | undefined
      };
      
      // Handle think tags
      if (content.includes('<think>')) {
        // Set thinking start timestamp when we first enter thinking state
        if (!isThinking) {
          thinkStartTimestamp = timestamp;
          clientSideThinkingStartTime = Date.now();
          result.thinkingStartTime = clientSideThinkingStartTime;
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
          
          // Record thinking end timestamp
          thinkEndTimestamp = timestamp;
          
          // Calculate thinking time from timestamps if both are available
          if (thinkStartTimestamp && thinkEndTimestamp) {
            const startDate = new Date(thinkStartTimestamp).getTime();
            const endDate = new Date(thinkEndTimestamp).getTime();
            result.thinkingTime = endDate - startDate;
          } else if (clientSideThinkingStartTime) {
            // Fall back to client-side timing if server timestamps are missing
            result.thinkingTime = Date.now() - clientSideThinkingStartTime;
          }
          
          isThinking = false;
          result.thinking = false;
          result.hasFinishedThinking = true;
          clientSideThinkingStartTime = undefined;
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
          
          // Record thinking end timestamp
          thinkEndTimestamp = timestamp;
          
          // Calculate thinking time from timestamps
          if (thinkStartTimestamp && thinkEndTimestamp) {
            const startDate = new Date(thinkStartTimestamp).getTime();
            const endDate = new Date(thinkEndTimestamp).getTime();
            result.thinkingTime = endDate - startDate;
          } else if (clientSideThinkingStartTime) {
            // Fall back to client-side timing
            result.thinkingTime = Date.now() - clientSideThinkingStartTime;
          }
          
          isThinking = false;
          result.thinking = false;
          result.hasFinishedThinking = true;
          clientSideThinkingStartTime = undefined;
        } else {
          // Still thinking
          result.think = thinkQueue + content;
          result.thinking = true;
        }
      } else {
        // Normal content (no thinking)
        // Check if the content contains an ending think tag without a start tag
        // This can happen if the start tag was in a previous chunk
        if (content.includes('</think>')) {
          const endIndex = content.indexOf('</think>');
          const thinkContent = content.substring(0, endIndex).trim();
          
          if (thinkQueue) {
            result.think = thinkQueue + thinkContent;
          }
          
          // Extract actual content after thinking
          const contentAfterThinking = content.substring(endIndex + '</think>'.length).trim();
          result.content = messageQueue + contentAfterThinking;
          
          // Record thinking end timestamp
          thinkEndTimestamp = timestamp;
          
          // Calculate thinking time
          if (thinkStartTimestamp && thinkEndTimestamp) {
            const startDate = new Date(thinkStartTimestamp).getTime();
            const endDate = new Date(thinkEndTimestamp).getTime();
            result.thinkingTime = endDate - startDate;
          } else if (clientSideThinkingStartTime) {
            result.thinkingTime = Date.now() - clientSideThinkingStartTime;
          }
          
          result.hasFinishedThinking = true;
          clientSideThinkingStartTime = undefined;
        } else {
          result.content = messageQueue + content;
        }
        result.thinking = false;
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
        
        const timestamp = rawData.created_at || new Date().toISOString();
        
        // Handle case of no message content
        if (!rawData.message?.content) {
          return {
            model: rawData.model || request.model,
            created_at: timestamp,
            message: {
              role: 'assistant',
              content: messageQueue
            },
            done: !!rawData.done,
            thinking: isThinking,
            think: thinkQueue,
            thinkingStartTime: clientSideThinkingStartTime,
            thinkingTime: calculateThinkingTime()
          };
        }
        
        // Check if this message contains thinking tags
        const messageContent = rawData.message.content;
        
        // Track thinking state based on content
        if (messageContent.includes('<think>') && !isThinking) {
          thinkStartTimestamp = timestamp;
          clientSideThinkingStartTime = Date.now();
          isThinking = true;
        } else if (messageContent.includes('</think>') && isThinking) {
          thinkEndTimestamp = timestamp;
          isThinking = false;
        }
        
        // Process the message content to separate thinking and content
        const processed = processMessageContent(messageContent, timestamp);
        
        // Create transformed response
        return {
          model: rawData.model || request.model,
          created_at: timestamp,
          message: {
            role: 'assistant',
            content: processed.content
          },
          done: !!rawData.done,
          thinking: processed.thinking,
          think: processed.think,
          thinkingStartTime: processed.thinkingStartTime || clientSideThinkingStartTime,
          thinkingTime: processed.thinkingTime || calculateThinkingTime()
        };
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
          thinkingStartTime: clientSideThinkingStartTime,
          thinkingTime: calculateThinkingTime()
        };
      }
    };
    
    // Helper function to calculate thinking time based on timestamps or client timing
    const calculateThinkingTime = (): number | undefined => {
      if (thinkStartTimestamp && thinkEndTimestamp) {
        const startDate = new Date(thinkStartTimestamp).getTime();
        const endDate = new Date(thinkEndTimestamp).getTime();
        return endDate - startDate;
      } else if (clientSideThinkingStartTime && isThinking) {
        // For real-time updates during thinking
        return Date.now() - clientSideThinkingStartTime;
      } else if (clientSideThinkingStartTime && thinkEndTimestamp) {
        // Fallback when thinking has ended but we're missing start timestamp
        return new Date(thinkEndTimestamp).getTime() - clientSideThinkingStartTime;
      }
      return undefined;
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
            if (!line?.startsWith('data:')) {
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

              // Store "thinking" events based on content
              if (data.message?.content) {
                if (data.message.content.includes('<think>') && !isThinking) {
                  thinkStartTimestamp = data.created_at;
                  isThinking = true;
                } else if (data.message.content.includes('</think>') && isThinking) {
                  thinkEndTimestamp = data.created_at;
                  isThinking = false;
                }
              }
              
              // Transform and send the message
              const transformedMessage = transformToMessageWithThinking(data);
              onMessage(transformedMessage);
              
              // Handle completion
              if (data.done) {
                // Send final message with calculated thinking time
                const finalMessage: EnhancedOllamaResponse = {
                  ...transformedMessage,
                  done: true,
                  thinkingTime: calculateThinkingTime()
                };
                onMessage(finalMessage);
                return;
              }
            } catch (e) {
              console.warn("Error parsing SSE message:", e, jsonStr);
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
