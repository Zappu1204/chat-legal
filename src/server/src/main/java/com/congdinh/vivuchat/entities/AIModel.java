package com.congdinh.vivuchat.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_models")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(unique = true, nullable = false)
    private String name;
    
    private String displayName;
    
    private String description;
    
    @Builder.Default
    private boolean isActive = true;
    
    private String category;
    
    private Long contextLength;
    
    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;
    
    @UpdateTimestamp
    private Instant updatedAt;
}
