package com.congdinh.vivuchat.dtos.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAdminResponse {
    private UUID id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String displayName;
    private String phoneNumber;
    private Boolean isActive;
    private Instant lockedUntil;
    private List<String> roles;
    private Instant createdAt;
    private Instant updatedAt;
    
    // Statistics
    private Integer chatCount;
    private Integer messageCount;
    private Instant lastActivity;
}
