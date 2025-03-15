package com.congdinh.vivuchat.services.implementations;

import com.congdinh.vivuchat.dtos.requests.ChangePasswordRequest;
import com.congdinh.vivuchat.dtos.requests.UpdateProfileRequest;
import com.congdinh.vivuchat.dtos.responses.MessageResponse;
import com.congdinh.vivuchat.dtos.responses.UserProfileResponse;
import com.congdinh.vivuchat.entities.Role;
import com.congdinh.vivuchat.entities.User;
import com.congdinh.vivuchat.exceptions.ResourceNotFoundException;
import com.congdinh.vivuchat.exceptions.ServiceException;
import com.congdinh.vivuchat.repositories.IUserRepository;
import com.congdinh.vivuchat.services.interfaces.IUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService implements IUserService {

    private final PasswordEncoder passwordEncoder;
    private final IUserRepository userRepository;

    @Override
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }

    @Override
    public User findById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    @Override
    public UserProfileResponse getUserProfile(String username) {
        log.info("Getting profile for user: {}", username);
        try {
            User user = findByUsername(username);
            return mapUserToProfileResponse(user);
        } catch (Exception e) {
            log.error("Error retrieving profile for user {}: {}", username, e.getMessage());
            throw new ServiceException("Could not retrieve user profile: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public UserProfileResponse updateProfile(String username, UpdateProfileRequest request) {
        log.info("Updating profile for user: {}", username);
        User user = findByUsername(username);
        boolean updated = false;

        try {
            if (request.getFirstName() != null && !Objects.equals(request.getFirstName(), user.getFirstName())) {
                user.setFirstName(request.getFirstName());
                updated = true;
                log.debug("Updated first name for user {}", username);
            }

            if (request.getLastName() != null && !Objects.equals(request.getLastName(), user.getLastName())) {
                user.setLastName(request.getLastName());
                updated = true;
                log.debug("Updated last name for user {}", username);
            }

            if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
                // Check if email is already in use
                if (userRepository.existsByEmail(request.getEmail()) &&
                        !user.getEmail().equalsIgnoreCase(request.getEmail())) {
                    throw new ServiceException("Email is already in use: " + request.getEmail());
                }
                user.setEmail(request.getEmail());
                updated = true;
                log.debug("Updated email for user {}", username);
            }

            if (request.getPhoneNumber() != null && !Objects.equals(request.getPhoneNumber(), user.getPhoneNumber())) {
                user.setPhoneNumber(request.getPhoneNumber());
                updated = true;
                log.debug("Updated phone number for user {}", username);
            }

            if (updated) {
                user = userRepository.save(user);
                log.info("Successfully updated profile for user: {}", username);
            } else {
                log.info("No changes detected for user: {}", username);
            }

            return mapUserToProfileResponse(user);
        } catch (ServiceException se) {
            throw se;
        } catch (Exception e) {
            log.error("Error updating profile for user {}: {}", username, e.getMessage());
            throw new ServiceException("Failed to update profile: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public MessageResponse changePassword(String username, ChangePasswordRequest request) {
        log.info("Changing password for user: {}", username);
        
        try {
            User user = findByUsername(username);

            // Validate current password
            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                log.warn("Current password is incorrect for user: {}", username);
                throw new ServiceException("Current password is incorrect");
            }

            // Validate new password matches confirmation
            if (!Objects.equals(request.getNewPassword(), request.getConfirmPassword())) {
                log.warn("New password and confirmation don't match for user: {}", username);
                throw new ServiceException("New password and confirmation don't match");
            }

            // Update password
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            userRepository.save(user);

            log.info("Password changed successfully for user: {}", username);
            return MessageResponse.builder()
                    .message("Password changed successfully")
                    .success(true)
                    .build();
        } catch (ServiceException se) {
            throw se;
        } catch (Exception e) {
            log.error("Error changing password for user {}: {}", username, e.getMessage());
            throw new ServiceException("Failed to change password: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public MessageResponse updateAvatar(String username, String avatarUrl) {
        log.info("Updating avatar for user: {}", username);
        
        try {
            User user = findByUsername(username);
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);

            log.info("Avatar updated successfully for user: {}", username);
            return MessageResponse.builder()
                    .message("Avatar updated successfully")
                    .success(true)
                    .build();
        } catch (Exception e) {
            log.error("Error updating avatar for user {}: {}", username, e.getMessage());
            throw new ServiceException("Failed to update avatar: " + e.getMessage());
        }
    }

    @Override
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    private UserProfileResponse mapUserToProfileResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .phoneNumber(user.getPhoneNumber())
                .roles(user.getRoles().stream()
                        .map(Role::getName)
                        .toList())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
