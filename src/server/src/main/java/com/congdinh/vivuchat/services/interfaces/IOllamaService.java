package com.congdinh.vivuchat.services.interfaces;

import com.congdinh.vivuchat.dtos.ollama.OllamaCompletionResponse;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

public interface IOllamaService {
    // Non-streaming response
    OllamaCompletionResponse generateCompletion(String model, List<Map<String, String>> messages);
    
    // Streaming response for EventSource/SSE
    Flux<ServerSentEvent<Object>> streamCompletion(
            String model, 
            List<Map<String, String>> messages, 
            boolean streaming,
            Map<String, Object> options
    );
    
    String getSystemPrompt();
}
