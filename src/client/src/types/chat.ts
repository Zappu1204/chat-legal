export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
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
}

// Backend API response types
export interface ChatResponse {
  id: string;
  title: string;
  description?: string;
  model: string;
  messages: ChatMessageResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageResponse {
  id: string;
  role: string;
  content: string;
  tokens?: number;
  model?: string;
  createdAt: string;
}

export interface ChatContextType extends ChatState {
  sendMessage: (content: string) => void;
  clearMessages: () => void;
  dismissError: () => void;
  createNewChat: (createInDatabase?: boolean) => Promise<ChatResponse | null>;
  loadChatHistory: () => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
}

export interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  error: string | null;
  isSaving: boolean;
  activeChatId: string | null;
  chatTitle: string;
  chatHistory: ChatResponse[];
  isLoadingHistory: boolean;
}