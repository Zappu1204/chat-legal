package com.congdinh.vivuchat.services.implementations;

import com.congdinh.vivuchat.dtos.ollama.OllamaApiResponse;
import com.congdinh.vivuchat.dtos.ollama.OllamaModelDetails;
import com.congdinh.vivuchat.dtos.ollama.OllamaModelResponse;
import com.congdinh.vivuchat.services.interfaces.IOllamaModelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class OllamaModelService implements IOllamaModelService {

    private final WebClient ollamaWebClient;

    @Override
    public Mono<List<OllamaModelResponse>> listLocalModels() {
        return ollamaWebClient.get()
                .uri("/tags")
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(OllamaApiResponse.class)
                .map(response -> {
                    if (response != null && response.getModels() != null) {
                        return response.getModels();
                    }
                    return Collections.<OllamaModelResponse>emptyList();
                })
                .doOnError(e -> log.error("Failed to list local models: {}", e.getMessage()))
                .onErrorResume(e -> Mono.just(Collections.emptyList()));
    }

    @Override
    public Mono<OllamaModelDetails> getModelDetails(String model) {
        return ollamaWebClient.post()
                .uri("/show")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("model", model))
                .retrieve()
                .bodyToMono(OllamaApiResponse.class)
                .map(OllamaApiResponse::getDetails)
                .doOnError(e -> log.error("Failed to get model details for {}: {}", model, e.getMessage()))
                .onErrorResume(e -> Mono.empty());
    }

    @Override
    public Mono<Boolean> copyModel(String source, String destination) {
        return ollamaWebClient.post()
                .uri("/copy")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of(
                        "source", source,
                        "destination", destination))
                .retrieve()
                .toBodilessEntity()
                .map(response -> response.getStatusCode().is2xxSuccessful())
                .doOnError(
                        e -> log.error("Failed to copy model from {} to {}: {}", source, destination, e.getMessage()))
                .onErrorResume(e -> Mono.just(false));
    }

    @Override
    public Mono<Boolean> deleteModel(String model) {
        return ollamaWebClient.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("model", model))
                .retrieve()
                .toBodilessEntity()
                .map(response -> response.getStatusCode().is2xxSuccessful())
                .doOnError(e -> {
                    if (e instanceof WebClientResponseException.NotFound) {
                        log.warn("Model {} not found for deletion", model);
                    } else {
                        log.error("Failed to delete model {}: {}", model, e.getMessage());
                    }
                })
                .onErrorResume(WebClientResponseException.NotFound.class, e -> Mono.just(false))
                .onErrorResume(e -> Mono.just(false));
    }

    @Override
    public Mono<String> pullModel(String model, boolean insecure, boolean stream) {
        Map<String, Object> requestBody;
        if (insecure) {
            requestBody = Map.of(
                    "model", model,
                    "insecure", true,
                    "stream", stream);
        } else {
            requestBody = Map.of(
                    "model", model,
                    "stream", stream);
        }

        return ollamaWebClient.post()
                .uri("/pull")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(OllamaApiResponse.class)
                .map(response -> {
                    if (response.getStatus() != null) {
                        return response.getStatus();
                    }
                    return "success";
                })
                .doOnError(e -> log.error("Failed to pull model {}: {}", model, e.getMessage()))
                .onErrorResume(e -> Mono.just("error: " + e.getMessage()));
    }

    @Override
    public Mono<String> pushModel(String model, boolean insecure, boolean stream) {
        Map<String, Object> requestBody;
        if (insecure) {
            requestBody = Map.of(
                    "model", model,
                    "insecure", true,
                    "stream", stream);
        } else {
            requestBody = Map.of(
                    "model", model,
                    "stream", stream);
        }

        return ollamaWebClient.post()
                .uri("/push")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(OllamaApiResponse.class)
                .map(response -> {
                    if (response.getStatus() != null) {
                        return response.getStatus();
                    }
                    return "success";
                })
                .doOnError(e -> log.error("Failed to push model {}: {}", model, e.getMessage()))
                .onErrorResume(e -> Mono.just("error: " + e.getMessage()));
    }

    @Override
    public Mono<List<OllamaModelResponse>> listRunningModels() {
        return ollamaWebClient.get()
                .uri("/ps")
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(OllamaApiResponse.class)
                .map(response -> {
                    if (response != null && response.getModels() != null) {
                        return response.getModels();
                    }
                    return Collections.<OllamaModelResponse>emptyList();
                })
                .doOnError(e -> log.error("Failed to list running models: {}", e.getMessage()))
                .onErrorResume(e -> Mono.just(Collections.emptyList()));
    }
}
