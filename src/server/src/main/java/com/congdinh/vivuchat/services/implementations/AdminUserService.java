package com.congdinh.vivuchat.services.implementations;

import com.congdinh.vivuchat.dtos.admin.UserAdminResponse;
import com.congdinh.vivuchat.dtos.admin.UserStatusUpdateRequest;
import com.congdinh.vivuchat.dtos.responses.MessageResponse;
import com.congdinh.vivuchat.entities.Role;
import com.congdinh.vivuchat.entities.User;
import com.congdinh.vivuchat.exceptions.ResourceNotFoundException;
import com.congdinh.vivuchat.exceptions.ServiceException;
import com.congdinh.vivuchat.repositories.IChatRepository;
import com.congdinh.vivuchat.repositories.IMessageRepository;
import com.congdinh.vivuchat.repositories.IUserRepository;
import com.congdinh.vivuchat.services.interfaces.IAdminUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserService implements IAdminUserService {

    private final IUserRepository userRepository;
    private final IChatRepository chatRepository;
    private final IMessageRepository messageRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<UserAdminResponse> findAllUsers(String search, Boolean isActive, Pageable pageable) {
        log.info("Finding users with search={}, isActive={}, page={}", search, isActive, pageable);
        
        // Use custom repository method for search
        Page<User> users;
        if (search != null && !search.isBlank()) {
            users = userRepository.findByUsernameContainingOrEmailContainingOrFirstNameContainingOrLastNameContaining(
                search, search, search, search, pageable
            );
        } else if (isActive != null) {
            users = userRepository.findByIsActive(isActive, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        
        return users.map(this::mapToUserAdminResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public UserAdminResponse getUserDetails(UUID userId) {
        log.info("Getting details for user with ID: {}", userId);
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
            
        return mapToUserAdminResponse(user);
    }

    @Override
    @Transactional
    public MessageResponse updateUserStatus(UUID userId, UserStatusUpdateRequest request) {
        log.info("Updating status for user with ID: {}, request: {}", userId, request);
        
        try {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
            
            boolean hasAdminRole = user.getRoles().stream()
                .anyMatch(role -> role.getName().equals("ROLE_ADMIN"));
            
            if (hasAdminRole && Boolean.FALSE.equals(request.getIsActive())) {
                throw new ServiceException("Cannot deactivate administrator account");
            }
            
            if (request.getIsActive() != null) {
                user.setIsActive(request.getIsActive());
            }
            
            if (request.getLockedUntil() != null) {
                user.setLockedUntil(request.getLockedUntil());
            }
            
            userRepository.save(user);
            
            String statusMessage = Boolean.TRUE.equals(request.getIsActive()) 
                ? "User account has been activated" 
                : "User account has been deactivated";
                
            return MessageResponse.builder()
                .message(statusMessage)
                .success(true)
                .build();
                
        } catch (ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error updating user status", e);
            throw new ServiceException("Failed to update user status: " + e.getMessage());
        }
    }
    
    private UserAdminResponse mapToUserAdminResponse(User user) {
        // Fix: Update to use the corrected method name for counting chats
        Integer chatCount = chatRepository.countByUserId(user.getId());
        Integer messageCount = messageRepository.countByUser(user.getId());
        
        return UserAdminResponse.builder()
            .id(user.getId())
            .username(user.getUsername())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .displayName(user.getDisplayName())
            .phoneNumber(user.getPhoneNumber())
            .isActive(user.getIsActive())
            .lockedUntil(user.getLockedUntil())
            .roles(user.getRoles().stream().map(Role::getName).toList())
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .chatCount(chatCount)
            .messageCount(messageCount)
            .build();
    }
}
