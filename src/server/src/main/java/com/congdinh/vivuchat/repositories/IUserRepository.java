package com.congdinh.vivuchat.repositories;

import com.congdinh.vivuchat.entities.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface IUserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    // Admin search functions
    Page<User> findByIsActive(Boolean isActive, Pageable pageable);
    Page<User> findByUsernameContainingOrEmailContainingOrFirstNameContainingOrLastNameContaining(
        String username, String email, String firstName, String lastName, Pageable pageable);
}
