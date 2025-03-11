package com.congdinh.vivuchat.services.implementations;

import com.congdinh.vivuchat.dtos.ollama.OllamaCompletionResponse;
import com.congdinh.vivuchat.dtos.requests.ChatRequest;
import com.congdinh.vivuchat.dtos.requests.MessageRequest;
import com.congdinh.vivuchat.dtos.responses.ChatResponse;
import com.congdinh.vivuchat.dtos.responses.ChatMessageResponse;
import com.congdinh.vivuchat.entities.Chat;
import com.congdinh.vivuchat.entities.Message;
import com.congdinh.vivuchat.entities.Message.MessageRole;
import com.congdinh.vivuchat.entities.User;
import com.congdinh.vivuchat.repositories.IAIModelRepository;
import com.congdinh.vivuchat.repositories.IChatRepository;
import com.congdinh.vivuchat.repositories.IMessageRepository;
import com.congdinh.vivuchat.repositories.IUserRepository;
import com.congdinh.vivuchat.services.interfaces.IChatService;
import com.congdinh.vivuchat.services.interfaces.IOllamaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService implements IChatService {

    private final IChatRepository chatRepository;
    private final IMessageRepository messageRepository;
    private final IUserRepository userRepository;
    private final IAIModelRepository aiModelRepository;
    private final IOllamaService ollamaService;

    @Override
    @Transactional
    public ChatResponse createChat(String username, ChatRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
                
        // Validate that the model exists
        aiModelRepository.findByName(request.getModel())
                .orElseThrow(() -> new IllegalArgumentException("AI model not found: " + request.getModel()));
                
        Chat chat = Chat.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .model(request.getModel())
                .user(user)
                .build();
                
        Chat savedChat = chatRepository.save(chat);
        log.info("Created new chat with ID: {} for user: {}", savedChat.getId(), username);
        
        return mapToResponse(savedChat, new ArrayList<>());
    }

    @Override
    @Transactional(readOnly = true)
    public ChatResponse getChat(String username, UUID chatId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
                
        Chat chat = chatRepository.findByIdAndUser(chatId, user)
                .orElseThrow(() -> new RuntimeException("Chat not found or you don't have access"));
                
        List<Message> messages = messageRepository.findByChatOrderByCreatedAtAsc(chat);
        
        return mapToResponse(chat, messages);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ChatResponse> getUserChats(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
                
        Page<Chat> chats = chatRepository.findByUser(user, pageable);
        
        return chats.map(chat -> {
            List<Message> messages = new ArrayList<>(); // Don't load messages for list view
            return mapToResponse(chat, messages);
        });
    }

    @Override
    @Transactional
    public void deleteChat(String username, UUID chatId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
                
        Chat chat = chatRepository.findByIdAndUser(chatId, user)
                .orElseThrow(() -> new RuntimeException("Chat not found or you don't have access"));
                
        chatRepository.delete(chat);
        log.info("Deleted chat with ID: {} for user: {}", chatId, username);
    }

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(String username, UUID chatId, MessageRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
                
        Chat chat = chatRepository.findByIdAndUser(chatId, user)
                .orElseThrow(() -> new RuntimeException("Chat not found or you don't have access"));
                
        // Save user message
        Message userMessage = Message.builder()
                .role(MessageRole.USER)
                .content(request.getContent())
                .chat(chat)
                .model(chat.getModel())
                .build();
                
        userMessage = messageRepository.save(userMessage);
        
        // Get conversation history for context (last 20 messages)
        List<Message> chatHistory = messageRepository.findByChatOrderByCreatedAtAsc(chat);
        int maxHistoryMessages = 20;
        if (chatHistory.size() > maxHistoryMessages) {
            chatHistory = chatHistory.subList(chatHistory.size() - maxHistoryMessages, chatHistory.size());
        }
        
        // Format messages for Ollama API
        List<Map<String, String>> messages = chatHistory.stream()
                .map(msg -> {
                    Map<String, String> msgMap = new HashMap<>();
                    msgMap.put("role", msg.getRole().name().toLowerCase());
                    msgMap.put("content", msg.getContent());
                    return msgMap;
                })
                .collect(Collectors.toList());
                
        // Add the most recent user message
        Map<String, String> userMsg = new HashMap<>();
        userMsg.put("role", "user");
        userMsg.put("content", request.getContent());
        messages.add(userMsg);
        
        // Get response from Ollama
        OllamaCompletionResponse aiResponse = ollamaService.generateCompletion(chat.getModel(), messages);
        
        // Save AI response
        Message assistantMessage = Message.builder()
                .role(MessageRole.ASSISTANT)
                .content(aiResponse.getMessage().getContent())
                .chat(chat)
                .model(chat.getModel())
                .build();
                
        assistantMessage = messageRepository.save(assistantMessage);
        
        // Update chat title if this is the first message
        if (chatHistory.isEmpty() && chat.getTitle().equals("New Chat")) {
            // Generate a title based on the first user message
            String title = request.getContent();
            if (title.length() > 30) {
                title = title.substring(0, 27) + "...";
            }
            chat.setTitle(title);
            chatRepository.save(chat);
        }
        
        // Return the AI response
        return mapToMessageResponse(assistantMessage);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getChatMessages(String username, UUID chatId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
                
        Chat chat = chatRepository.findByIdAndUser(chatId, user)
                .orElseThrow(() -> new RuntimeException("Chat not found or you don't have access"));
                
        List<Message> messages = messageRepository.findByChatOrderByCreatedAtAsc(chat);
        
        return messages.stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());
    }
    
    private ChatResponse mapToResponse(Chat chat, List<Message> messages) {
        List<ChatMessageResponse> messageResponses = messages.stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());
                
        return ChatResponse.builder()
                .id(chat.getId())
                .title(chat.getTitle())
                .description(chat.getDescription())
                .model(chat.getModel())
                .messages(messageResponses)
                .createdAt(chat.getCreatedAt())
                .updatedAt(chat.getUpdatedAt())
                .build();
    }
    
    private ChatMessageResponse mapToMessageResponse(Message message) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .role(message.getRole())
                .content(message.getContent())
                .tokens(message.getTokens())
                .model(message.getModel())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
