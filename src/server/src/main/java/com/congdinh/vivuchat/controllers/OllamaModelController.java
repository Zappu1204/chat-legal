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

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    public ResponseEntity<List<OllamaModelResponse>> listLocalModels() {
        try {
            List<OllamaModelResponse> models = ollamaModelService.listLocalModels();
            return ResponseEntity.ok(models);
        } catch (Exception e) {
            log.error("Error listing local models", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
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
    public ResponseEntity<List<OllamaModelResponse>> listRunningModels() {
        try {
            List<OllamaModelResponse> models = ollamaModelService.listRunningModels();
            return ResponseEntity.ok(models);
        } catch (Exception e) {
            log.error("Error listing running models", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
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
    public ResponseEntity<OllamaModelDetails> getModelDetails(@PathVariable String model) {
        try {
            OllamaModelDetails details = ollamaModelService.getModelDetails(model);
            if (details != null) {
                return ResponseEntity.ok(details);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Error getting model details for {}", model, e);
            return ResponseEntity.notFound().build();
        }
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
    public ResponseEntity<Map<String, String>> copyModel(@RequestBody CopyModelRequest request) {
        try {
            boolean result = ollamaModelService.copyModel(request.getSource(), request.getDestination());
            if (result) {
                return ResponseEntity.ok(Map.of("message", "Model copied successfully"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "Failed to copy model"));
            }
        } catch (Exception e) {
            log.error("Error copying model from {} to {}", request.getSource(), request.getDestination(), e);
            return ResponseEntity.badRequest().body(Map.of("message", "Error: " + e.getMessage()));
        }
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
    public ResponseEntity<Map<String, String>> deleteModel(@PathVariable String model) {
        try {
            boolean result = ollamaModelService.deleteModel(model);
            if (result) {
                return ResponseEntity.ok(Map.of("message", "Model deleted successfully"));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Model not found"));
            }
        } catch (Exception e) {
            log.error("Error deleting model {}", model, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error deleting model: " + e.getMessage()));
        }
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
    public ResponseEntity<Map<String, String>> pullModel(@RequestBody ModelRequest request) {
        try {
            String status = ollamaModelService.pullModel(request.getModel(), request.isInsecure(), request.isStream());
            return ResponseEntity.ok(Map.of("status", status));
        } catch (Exception e) {
            log.error("Error pulling model {}", request.getModel(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error: " + e.getMessage()));
        }
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
    public ResponseEntity<Map<String, String>> pushModel(@RequestBody ModelRequest request) {
        try {
            String status = ollamaModelService.pushModel(request.getModel(), request.isInsecure(), request.isStream());
            return ResponseEntity.ok(Map.of("status", status));
        } catch (Exception e) {
            log.error("Error pushing model {}", request.getModel(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error: " + e.getMessage()));
        }
    }

    // Add a method to simply list available models for frontend use
    @GetMapping("/available")
    @Operation(
            summary = "List available models",
            description = "Get a simple list of available models for use in chat",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Available models retrieved successfully"
                    )
            }
    )
    public ResponseEntity<Map<String, Object>> getAvailableModels() {
        try {
            List<OllamaModelResponse> models = ollamaModelService.listLocalModels();
            List<Map<String, Object>> formattedModels = models.stream()
                    .map(model -> {
                        Map<String, Object> modelMap = new HashMap<>();
                        modelMap.put("name", model.getName());
                        modelMap.put("displayName", model.getName().replace(":", " "));
                        
                        // Extract parameter size if available
                        if (model.getDetails() != null && model.getDetails().getParameterSize() != null) {
                            modelMap.put("size", model.getDetails().getParameterSize());
                        }
                        
                        // Add other relevant details
                        modelMap.put("modified", model.getModifiedAt());
                        
                        return modelMap;
                    })
                    .toList();
                    
            Map<String, Object> response = new HashMap<>();
            response.put("models", formattedModels);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting available models", e);
            return ResponseEntity.ok(Map.of("models", Collections.emptyList()));
        }
    }
}
