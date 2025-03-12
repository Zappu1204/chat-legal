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
    const messageQueue = { current: '' };
    
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
    
    // Implementation similar to the example code
    const transformToMessageWithThinking = (message: { role: string; content: string }): EnhancedOllamaResponse => {
      const baseMessage: EnhancedOllamaResponse = {
        model: request.model,
        message: {
          role: message.role,
          content: message.content
        },
        done: false,
        created_at: new Date().toISOString()
      };

      if (message.role !== MessageRole.Assistant) {
        return baseMessage;
      }

      const isStartingToThink = message.content.includes("<think>") && !message.content.includes("</think>");
      const hasFinishedThinking = message.content.includes("</think>");

      const cleanThinkContent = (text: string) =>
        text.replace(/<think>|<\/think>/g, '').trim();

      const thinkMatch = message.content.match(/<think>(.*?)<\/think>(.*)?/s);

      // Get previous message state from sessionStorage
      const prevThinkingStartTime = sessionStorage.getItem('thinkingStartTime');
      const prevThinkingTime = sessionStorage.getItem('thinkingTime');

      // Calculate thinking time if thinking has finished
      let thinkingTime;
      if (hasFinishedThinking && prevThinkingStartTime) {
        thinkingTime = Date.now() - parseInt(prevThinkingStartTime);
        sessionStorage.setItem('thinkingTime', thinkingTime.toString());
        sessionStorage.removeItem('thinkingStartTime');
      } else if (prevThinkingTime) {
        thinkingTime = parseInt(prevThinkingTime);
      }

      // Store thinking start time if just started thinking
      if (isStartingToThink && !prevThinkingStartTime) {
        sessionStorage.setItem('thinkingStartTime', Date.now().toString());
        sessionStorage.removeItem('thinkingTime');
      }

      if (!thinkMatch) {
        return {
          ...baseMessage,
          thinking: isStartingToThink,
          think: cleanThinkContent(message.content),
          message: { ...baseMessage.message, content: "" },
          thinkingStartTime: isStartingToThink ? Date.now() : undefined,
          thinkingTime
        };
      }

      return {
        ...baseMessage,
        thinking: isStartingToThink,
        think: cleanThinkContent(thinkMatch[1] || ""),
        message: { ...baseMessage.message, content: (thinkMatch[2] || "").trim() },
        thinkingStartTime: isStartingToThink ? Date.now() : undefined,
        thinkingTime
      };
    };

    // Start the streaming request using fetch with appropriate headers
    fetch(`${api.defaults.baseURL}/api/ollama/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {})
      },
      body: JSON.stringify(request),
      signal: abortController.signal,
      credentials: 'include'
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

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value);
          
          // Split by newline to handle multiple events in one chunk
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.trim() === '' || !line.startsWith('data:')) continue;
            
            try {
              const jsonStr = line.substring(5); // Remove 'data:'
              const data = JSON.parse(jsonStr.trim()) as OllamaCompletionResponse;
              
              if (data.error) {
                onError(new Error(data.error));
                return;
              }
              
              if (data.message?.content) {
                // Append to message queue
                messageQueue.current += data.message.content;
                
                // Transform and send the updated message
                const transformedMessage = transformToMessageWithThinking({
                  role: MessageRole.Assistant, 
                  content: messageQueue.current
                });
                
                onMessage(transformedMessage);
              }
              
              if (data.done) {
                const finalMessage = transformToMessageWithThinking({
                  role: MessageRole.Assistant,
                  content: messageQueue.current
                });
                // Mark as done
                finalMessage.done = true;
                onMessage(finalMessage);
                return;
              }
            } catch (e) {
              console.error('Error parsing SSE message:', e, line);
            }
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
