package com.congdinh.vivuchat.repositories;

import com.congdinh.vivuchat.entities.AIModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IAIModelRepository extends JpaRepository<AIModel, UUID> {
    Optional<AIModel> findByName(String name);
    List<AIModel> findByIsActiveTrue();
}
