package com.congdinh.vivuchat.controllers;

import com.congdinh.vivuchat.dtos.ollama.OllamaModelDetails;
import com.congdinh.vivuchat.dtos.ollama.OllamaModelResponse;
import com.congdinh.vivuchat.services.interfaces.IOllamaModelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ollama/models")
@RequiredArgsConstructor
@Tag(name = "Ollama Models", description = "Ollama model management endpoints")
@SecurityRequirement(name = "bearerAuth")
public class OllamaModelController {

    private final IOllamaModelService ollamaModelService;

    @Data
    public static class ModelRequest {
        private String model;
        private boolean insecure;
        private boolean stream = false;
    }

    @Data
    public static class CopyModelRequest {
        private String source;
        private String destination;
    }

    @GetMapping
    @Operation(
            summary = "List local models",
            description = "List all models available locally",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Models retrieved successfully",
                            content = @Content(array = @ArraySchema(schema = @Schema(implementation = OllamaModelResponse.class)))
                    )
            }
    )
    public Mono<ResponseEntity<List<OllamaModelResponse>>> listLocalModels() {
        return ollamaModelService.listLocalModels()
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.ok(List.of()));
    }

    @GetMapping("/running")
    @Operation(
            summary = "List running models",
            description = "List all currently running models",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Running models retrieved successfully",
                            content = @Content(array = @ArraySchema(schema = @Schema(implementation = OllamaModelResponse.class)))
                    )
            }
    )
    public Mono<ResponseEntity<List<OllamaModelResponse>>> listRunningModels() {
        return ollamaModelService.listRunningModels()
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.ok(List.of()));
    }

    @GetMapping("/{model}")
    @Operation(
            summary = "Get model details",
            description = "Get detailed information about a specific model",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Model details retrieved successfully",
                            content = @Content(schema = @Schema(implementation = OllamaModelDetails.class))
                    ),
                    @ApiResponse(
                            responseCode = "404",
                            description = "Model not found"
                    )
            }
    )
    public Mono<ResponseEntity<OllamaModelDetails>> getModelDetails(@PathVariable String model) {
        return ollamaModelService.getModelDetails(model)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PostMapping("/copy")
    @Operation(
            summary = "Copy model",
            description = "Create a copy of an existing model with a new name",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Model copied successfully"
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "Copy failed"
                    )
            }
    )
    public Mono<ResponseEntity<Map<String, String>>> copyModel(@RequestBody CopyModelRequest request) {
        return ollamaModelService.copyModel(request.getSource(), request.getDestination())
                .map(result -> {
                    if (Boolean.TRUE.equals(result)) {
                        return ResponseEntity.ok(Map.of("message", "Model copied successfully"));
                    } else {
                        return ResponseEntity.badRequest().body(Map.of("message", "Failed to copy model"));
                    }
                });
    }

    @DeleteMapping("/{model}")
    @Operation(
            summary = "Delete model",
            description = "Delete a model and its data",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Model deleted successfully"
                    ),
                    @ApiResponse(
                            responseCode = "404",
                            description = "Model not found"
                    )
            }
    )
    public Mono<ResponseEntity<Map<String, String>>> deleteModel(@PathVariable String model) {
        return ollamaModelService.deleteModel(model)
                .map(result -> {
                    if (Boolean.TRUE.equals(result)) {
                        return ResponseEntity.ok(Map.of("message", "Model deleted successfully"));
                    } else {
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Model not found"));
                    }
                });
    }

    @PostMapping("/pull")
    @Operation(
            summary = "Pull model",
            description = "Download a model from Ollama model library",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Pull operation status"
                    )
            }
    )
    public Mono<ResponseEntity<Map<String, String>>> pullModel(@RequestBody ModelRequest request) {
        return ollamaModelService.pullModel(request.getModel(), request.isInsecure(), request.isStream())
                .map(status -> ResponseEntity.ok(Map.of("status", status)));
    }

    @PostMapping("/push")
    @Operation(
            summary = "Push model",
            description = "Upload a model to Ollama model library",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Push operation status"
                    )
            }
    )
    public Mono<ResponseEntity<Map<String, String>>> pushModel(@RequestBody ModelRequest request) {
        return ollamaModelService.pushModel(request.getModel(), request.isInsecure(), request.isStream())
                .map(status -> ResponseEntity.ok(Map.of("status", status)));
    }
}
