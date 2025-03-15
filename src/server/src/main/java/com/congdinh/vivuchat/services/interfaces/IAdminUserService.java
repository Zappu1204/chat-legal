package com.congdinh.vivuchat.services.interfaces;

import com.congdinh.vivuchat.dtos.admin.UserAdminResponse;
import com.congdinh.vivuchat.dtos.admin.UserStatusUpdateRequest;
import com.congdinh.vivuchat.dtos.responses.MessageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface IAdminUserService {
    Page<UserAdminResponse> findAllUsers(String search, Boolean isActive, Pageable pageable);
    UserAdminResponse getUserDetails(UUID userId);
    MessageResponse updateUserStatus(UUID userId, UserStatusUpdateRequest request);
}
