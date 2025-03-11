package com.congdinh.vivuchat.repositories;

import com.congdinh.vivuchat.entities.Chat;
import com.congdinh.vivuchat.entities.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IChatRepository extends JpaRepository<Chat, UUID> {
    List<Chat> findByUserOrderByUpdatedAtDesc(User user);
    Page<Chat> findByUser(User user, Pageable pageable);
    Optional<Chat> findByIdAndUser(UUID id, User user);
}
