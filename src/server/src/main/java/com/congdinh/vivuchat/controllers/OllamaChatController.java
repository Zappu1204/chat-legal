package com.congdinh.vivuchat.controllers;

import com.congdinh.vivuchat.dtos.ollama.OllamaCompletionResponse;
import com.congdinh.vivuchat.services.interfaces.IOllamaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/ollama/chat")
@RequiredArgsConstructor
@Tag(name = "Ollama Chat", description = "Direct API for Ollama Chat completions")
@SecurityRequirement(name = "bearerAuth")
public class OllamaChatController {

    private final IOllamaService ollamaService;

    @Data
    public static class ChatRequest {
        private String model;
        private List<Map<String, String>> messages;
        private Boolean streaming = false;
        private Map<String, Object> options;
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Generate chat completion",
            description = "Generate a standard (non-streaming) chat completion from Ollama",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Completion generated successfully",
                            content = @Content(schema = @Schema(implementation = OllamaCompletionResponse.class))
                    )
            }
    )
    public OllamaCompletionResponse generateCompletion(@RequestBody ChatRequest request) {
        return ollamaService.generateCompletion(request.getModel(), request.getMessages());
    }

    @PostMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(
            summary = "Stream chat completion",
            description = "Generate a streaming chat completion from Ollama as Server-Sent Events",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "SSE stream of completion tokens"
                    )
            }
    )
    public Flux<ServerSentEvent<Object>> streamCompletion(@RequestBody ChatRequest request) {
        boolean streaming = Optional.ofNullable(request.getStreaming()).orElse(true);
        return ollamaService.streamCompletion(
                request.getModel(), 
                request.getMessages(), 
                streaming,
                request.getOptions()
        );
    }
}
