package com.congdinh.vivuchat.services.interfaces;

import com.congdinh.vivuchat.dtos.requests.ChangePasswordRequest;
import com.congdinh.vivuchat.dtos.requests.UpdateProfileRequest;
import com.congdinh.vivuchat.dtos.responses.MessageResponse;
import com.congdinh.vivuchat.dtos.responses.UserProfileResponse;
import com.congdinh.vivuchat.entities.User;

import java.util.UUID;

public interface IUserService {
    User findByUsername(String username);
    User findById(UUID id);
    UserProfileResponse getUserProfile(String username);
    UserProfileResponse updateProfile(String username, UpdateProfileRequest request);
    MessageResponse changePassword(String username, ChangePasswordRequest request);
    MessageResponse updateAvatar(String username, String avatarUrl);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
