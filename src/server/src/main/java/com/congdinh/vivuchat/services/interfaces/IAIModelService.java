package com.congdinh.vivuchat.services.interfaces;

import com.congdinh.vivuchat.dtos.responses.AIModelResponse;

import java.util.List;
import java.util.UUID;

public interface IAIModelService {
    List<AIModelResponse> getAllModels();
    List<AIModelResponse> getActiveModels();
    AIModelResponse getModelByName(String name);
    AIModelResponse getModelById(UUID id);
}
