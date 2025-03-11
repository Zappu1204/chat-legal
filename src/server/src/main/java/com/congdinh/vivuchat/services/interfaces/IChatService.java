package com.congdinh.vivuchat.services.interfaces;

import com.congdinh.vivuchat.dtos.requests.ChatRequest;
import com.congdinh.vivuchat.dtos.requests.MessageRequest;
import com.congdinh.vivuchat.dtos.responses.ChatResponse;
import com.congdinh.vivuchat.dtos.responses.ChatMessageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface IChatService {
    ChatResponse createChat(String username, ChatRequest request);
    ChatResponse getChat(String username, UUID chatId);
    Page<ChatResponse> getUserChats(String username, Pageable pageable);
    void deleteChat(String username, UUID chatId);
    ChatMessageResponse sendMessage(String username, UUID chatId, MessageRequest request);
    List<ChatMessageResponse> getChatMessages(String username, UUID chatId);
}
