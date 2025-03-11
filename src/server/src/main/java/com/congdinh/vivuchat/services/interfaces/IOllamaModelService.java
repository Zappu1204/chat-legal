package com.congdinh.vivuchat.services.interfaces;

import com.congdinh.vivuchat.dtos.ollama.OllamaModelResponse;
import com.congdinh.vivuchat.dtos.ollama.OllamaModelDetails;
import reactor.core.publisher.Mono;

import java.util.List;

public interface IOllamaModelService {
    /**
     * List all locally available models
     */
    Mono<List<OllamaModelResponse>> listLocalModels();
    
    /**
     * Get detailed information about a specific model
     */
    Mono<OllamaModelDetails> getModelDetails(String model);
    
    /**
     * Copy a model to create a new one
     */
    Mono<Boolean> copyModel(String source, String destination);
    
    /**
     * Delete a model
     */
    Mono<Boolean> deleteModel(String model);
    
    /**
     * Pull a model from Ollama's model library
     */
    Mono<String> pullModel(String model, boolean insecure, boolean stream);
    
    /**
     * Push a model to Ollama's model library
     */
    Mono<String> pushModel(String model, boolean insecure, boolean stream);
    
    /**
     * List currently running models
     */
    Mono<List<OllamaModelResponse>> listRunningModels();
}
