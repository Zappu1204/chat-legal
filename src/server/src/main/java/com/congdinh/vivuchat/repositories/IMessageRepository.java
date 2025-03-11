package com.congdinh.vivuchat.repositories;

import com.congdinh.vivuchat.entities.Chat;
import com.congdinh.vivuchat.entities.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IMessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByChatOrderByCreatedAtAsc(Chat chat);
    Page<Message> findByChat(Chat chat, Pageable pageable);
    long countByChat(Chat chat);
}
