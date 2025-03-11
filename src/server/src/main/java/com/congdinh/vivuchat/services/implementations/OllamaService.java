package com.congdinh.vivuchat.services.implementations;

import com.congdinh.vivuchat.config.OllamaConfig;
import com.congdinh.vivuchat.dtos.ollama.OllamaCompletionRequest;
import com.congdinh.vivuchat.dtos.ollama.OllamaCompletionResponse;
import com.congdinh.vivuchat.services.interfaces.IOllamaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OllamaService implements IOllamaService {

    private final WebClient ollamaWebClient;
    private final OllamaConfig ollamaConfig;
    
    @Override
    public OllamaCompletionResponse generateCompletion(String model, List<Map<String, String>> messages) {
        log.info("Generating completion for model: {}", model);
        
        // Convert messages to the format expected by Ollama
        List<OllamaCompletionRequest.OllamaMessage> ollamaMessages = messages.stream()
                .map(msg -> OllamaCompletionRequest.OllamaMessage.builder()
                        .role(msg.get("role"))
                        .content(msg.get("content"))
                        .build())
                .collect(Collectors.toList());
        
        // Prepend system message
        ollamaMessages.add(0, OllamaCompletionRequest.OllamaMessage.builder()
                .role("system")
                .content(getSystemPrompt())
                .build());
                
        // Build request
        OllamaCompletionRequest request = OllamaCompletionRequest.builder()
                .model(model)
                .messages(ollamaMessages)
                .stream(false)
                .build();
                
        try {
            // Make API call to Ollama with improved error handling and timeout
            return ollamaWebClient.post()
                    .uri("/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, 
                            response -> response.bodyToMono(String.class)
                                    .flatMap(error -> Mono.error(new RuntimeException("Ollama API error: " + error))))
                    .bodyToMono(OllamaCompletionResponse.class)
                    .timeout(Duration.ofSeconds(ollamaConfig.getTimeoutSeconds()))
                    .doOnError(WebClientResponseException.class, e -> 
                            log.error("Ollama API error: Status {}, Body {}", e.getStatusCode(), e.getResponseBodyAsString()))
                    .doOnError(e -> log.error("Error calling Ollama API", e))
                    .onErrorResume(e -> {
                        // Create fallback response
                        OllamaCompletionResponse.OllamaMessage errorMessage = new OllamaCompletionResponse.OllamaMessage(
                            "assistant", 
                            "I'm sorry, I encountered an error while processing your request. Please try again later."
                        );
                        
                        OllamaCompletionResponse fallback = OllamaCompletionResponse.builder()
                                .model(model)
                                .message(errorMessage)
                                .done(true)
                                .build();
                        
                        return Mono.just(fallback);
                    })
                    .block();
        } catch (Exception e) {
            log.error("Unexpected error calling Ollama API: ", e);
            
            // Create a fallback response in case of error
            OllamaCompletionResponse.OllamaMessage errorMessage = new OllamaCompletionResponse.OllamaMessage(
                "assistant", 
                "I'm sorry, I encountered an error while processing your request. Please try again later."
            );
            
            return OllamaCompletionResponse.builder()
                    .model(model)
                    .message(errorMessage)
                    .done(true)
                    .build();
        }
    }
    
    @Override
    public String getSystemPrompt() {
        return "You are a helpful, respectful and honest assistant. Always answer as helpfully as possible, while being " +
               "safe. Your answers should be informative and factually correct. If a question is unclear or lacks " +
               "factual coherence, explain why instead of answering something not correct. If you don't know the " +
               "answer to a question, please don't share false information.";
    }
}
