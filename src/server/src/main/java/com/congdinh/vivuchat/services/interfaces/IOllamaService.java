package com.congdinh.vivuchat.services.interfaces;

import com.congdinh.vivuchat.dtos.ollama.OllamaCompletionResponse;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

public interface IOllamaService {
    // Legacy method without options for backward compatibility
    default OllamaCompletionResponse generateCompletion(String model, List<Map<String, String>> messages) {
        return generateCompletion(model, messages, null);
    }
    
    // Non-streaming response with options
    OllamaCompletionResponse generateCompletion(String model, List<Map<String, String>> messages, Map<String, Object> options);
    
    // Streaming response for EventSource/SSE
    Flux<ServerSentEvent<Object>> streamCompletion(
            String model, 
            List<Map<String, String>> messages, 
            boolean streaming,
            Map<String, Object> options
    );
}
