package com.congdinh.vivuchat.dtos.responses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIModelResponse {
    private UUID id;
    private String name;
    private String displayName;
    private String description;
    private String category;
    private Long contextLength;
    private boolean isActive;
}
