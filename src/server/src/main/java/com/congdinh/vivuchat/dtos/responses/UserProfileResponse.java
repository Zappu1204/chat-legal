package com.congdinh.vivuchat.dtos.responses;

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
public class UserProfileResponse {
    private UUID id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String displayName;
    private String avatarUrl;
    private String phoneNumber;
    private List<String> roles;
    private Instant createdAt;
    private Instant updatedAt;
}
