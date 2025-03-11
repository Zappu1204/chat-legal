package com.congdinh.vivuchat.services.implementations;

import com.congdinh.vivuchat.dtos.responses.AIModelResponse;
import com.congdinh.vivuchat.entities.AIModel;
import com.congdinh.vivuchat.repositories.IAIModelRepository;
import com.congdinh.vivuchat.services.interfaces.IAIModelService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIModelService implements IAIModelService {

    private final IAIModelRepository modelRepository;

    @PostConstruct
    public void initDefaultModels() {
        // Initialize some default models if they don't exist
        if (modelRepository.count() == 0) {
            List<AIModel> defaultModels = Arrays.asList(
                AIModel.builder()
                    .name("llama2")
                    .displayName("Llama 2")
                    .description("Meta's Llama 2 model")
                    .category("General Purpose")
                    .contextLength(4096L)
                    .isActive(true)
                    .build(),
                AIModel.builder()
                    .name("mistral")
                    .displayName("Mistral 7B")
                    .description("Mistral's 7B parameter model")
                    .category("General Purpose")
                    .contextLength(8192L)
                    .isActive(true)
                    .build(),
                AIModel.builder()
                    .name("codellama")
                    .displayName("Code Llama")
                    .description("Specialized model for code generation")
                    .category("Code")
                    .contextLength(16384L)
                    .isActive(true)
                    .build()
            );
            
            modelRepository.saveAll(defaultModels);
            log.info("Initialized default AI models");
        }
    }

    @Override
    public List<AIModelResponse> getAllModels() {
        return modelRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public List<AIModelResponse> getActiveModels() {
        return modelRepository.findByIsActiveTrue().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public AIModelResponse getModelByName(String name) {
        return modelRepository.findByName(name)
                .map(this::mapToResponse)
                .orElseThrow(() -> new RuntimeException("Model not found: " + name));
    }

    @Override
    public AIModelResponse getModelById(UUID id) {
        return modelRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new RuntimeException("Model not found with id: " + id));
    }
    
    private AIModelResponse mapToResponse(AIModel model) {
        return AIModelResponse.builder()
                .id(model.getId())
                .name(model.getName())
                .displayName(model.getDisplayName())
                .description(model.getDescription())
                .category(model.getCategory())
                .contextLength(model.getContextLength())
                .isActive(model.isActive())
                .build();
    }
}
