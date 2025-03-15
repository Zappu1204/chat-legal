package com.congdinh.vivuchat.repositories;

import com.congdinh.vivuchat.entities.Chat;
import com.congdinh.vivuchat.entities.Message;
import com.congdinh.vivuchat.entities.Message.MessageRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IMessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByChatOrderByCreatedAtAsc(Chat chat);
    List<Message> findByChatOrderByCreatedAtDesc(Chat chat, Pageable pageable);
    Page<Message> findByChat(Chat chat, Pageable pageable);
    long countByChat(Chat chat);
    
    List<Message> findByChatAndRole(Chat chat, MessageRole role);
    List<Message> findByChatIdOrderByCreatedAtAsc(UUID chatId);
    
    // Fix the query to join with the user property of the chat
    @Query("SELECT COUNT(m) FROM Message m JOIN m.chat c WHERE c.user.id = :userId")
    Integer countByUser(@Param("userId") UUID userId);
}
