export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  thinking?: boolean;
  think?: string;
  thinkingStartTime?: number;
  thinkingTime?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OllamaChatRequest {
  model: string;
  messages: { role: string; content: string }[];
  streaming?: boolean;
  options?: Record<string, unknown>;
}

export interface OllamaMessage {
  role: string;
  content: string;
}

export interface OllamaCompletionResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  done_reason?: string;
  error?: string;
}

export enum MessageRole {
  User = "user",
  Assistant = "assistant",
  Tool = "tool",
  System = "system"
}
