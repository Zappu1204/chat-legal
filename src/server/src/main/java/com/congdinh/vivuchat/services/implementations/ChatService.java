package com.congdinh.vivuchat.services.implementations;

import com.congdinh.vivuchat.dtos.requests.ChatRequest;
import com.congdinh.vivuchat.dtos.requests.MessageRequest;
import com.congdinh.vivuchat.dtos.responses.ChatResponse;
import com.congdinh.vivuchat.dtos.responses.ChatMessageResponse;
import com.congdinh.vivuchat.entities.Chat;
import com.congdinh.vivuchat.entities.Message;
import com.congdinh.vivuchat.entities.Message.MessageRole;
import com.congdinh.vivuchat.entities.User;
import com.congdinh.vivuchat.repositories.IChatRepository;
import com.congdinh.vivuchat.repositories.IMessageRepository;
import com.congdinh.vivuchat.repositories.IUserRepository;
import com.congdinh.vivuchat.services.interfaces.IChatService;
import com.congdinh.vivuchat.services.interfaces.IOllamaModelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService implements IChatService {

    private final IChatRepository chatRepository;
    private final IMessageRepository messageRepository;
    private final IUserRepository userRepository;
    private final IOllamaModelService ollamaModelService;

    @Override
    @Transactional
    public ChatResponse createChat(String username, ChatRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
                
        // Validate that the model exists in Ollama
        boolean modelExists = ollamaModelService.getModelDetails(request.getModel()) != null;
        if (!modelExists) {
            throw new IllegalArgumentException("Model not found: " + request.getModel());
        }
                
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
        
        // Debug log to check incoming message content
        log.debug("Received message content: {}", request.getContent());
        
        // Validate message content
        if (request.getContent() == null || request.getContent().trim().isEmpty()) {
            throw new IllegalArgumentException("Message content cannot be empty");
        }
        
        // Improved logic for determining message role
        MessageRole messageRole;
        
        // Check if the content includes thinking tags (which would indicate it's from the AI assistant)
        if (request.getContent().contains("<think>") || request.getContent().contains("</think>")) {
            messageRole = MessageRole.ASSISTANT;
            log.debug("Detected as assistant message (contains thinking tags)");
        } else {
            // Look at the most recent message in the chat
            List<Message> recentMessages = messageRepository.findByChatOrderByCreatedAtDesc(chat, Pageable.ofSize(1));
            
            // If the last message was from a user, this is likely the assistant's response
            // If the last message was from the assistant, this is likely a user's message
            if (!recentMessages.isEmpty() && recentMessages.get(0).getRole() == MessageRole.USER) {
                messageRole = MessageRole.ASSISTANT;
                log.debug("Detected as assistant message (follows user message)");
            } else {
                messageRole = MessageRole.USER;
                log.debug("Detected as user message");
            }
        }
        
        // Save the message with the determined role
        Message message = Message.builder()
                .role(messageRole)
                .content(request.getContent())
                .chat(chat)
                .model(chat.getModel())
                .build();
                
        message = messageRepository.save(message);
        log.debug("Saved message to database with role: {}", message.getRole());
        
        // If this is a user message, check if we should update the chat title
        if (message.getRole() == MessageRole.USER) {
            List<Message> userMessages = messageRepository.findByChatAndRole(chat, MessageRole.USER);
            
            // If this is the first user message, use it to set the chat title
            if (userMessages.size() == 1 || chat.getTitle().equals("New Chat")) {
                String title = request.getContent();
                if (title.length() > 30) {
                    title = title.substring(0, 27) + "...";
                }
                chat.setTitle(title);
                chatRepository.save(chat);
                log.info("Updated chat title to: {}", title);
            }
        }
        
        return mapToMessageResponse(message);
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
                .toList();
    }
    
    private ChatResponse mapToResponse(Chat chat, List<Message> messages) {
        List<ChatMessageResponse> messageResponses = messages.stream()
                .map(this::mapToMessageResponse)
                .toList();
                
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
