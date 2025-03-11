package com.congdinh.vivuchat.services.interfaces;

import com.congdinh.vivuchat.dtos.ollama.OllamaModelDetails;
import com.congdinh.vivuchat.dtos.ollama.OllamaModelResponse;

import java.util.List;

public interface IOllamaModelService {
    // Non-streaming operations as synchronous methods
    List<OllamaModelResponse> listLocalModels();
    List<OllamaModelResponse> listRunningModels();
    OllamaModelDetails getModelDetails(String model);
    boolean copyModel(String source, String destination);
    boolean deleteModel(String model);
    
    // Potentially streaming operations that might benefit from reactive programming
    String pullModel(String model, boolean insecure, boolean stream);
    String pushModel(String model, boolean insecure, boolean stream);
}
