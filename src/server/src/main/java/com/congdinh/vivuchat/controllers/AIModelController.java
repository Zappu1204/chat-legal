package com.congdinh.vivuchat.controllers;

import com.congdinh.vivuchat.dtos.responses.AIModelResponse;
import com.congdinh.vivuchat.services.interfaces.IAIModelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/models")
@RequiredArgsConstructor
@Tag(name = "AI Models", description = "AI model management endpoints")
public class AIModelController {

    private final IAIModelService aiModelService;

    @GetMapping
    @Operation(
        summary = "List all AI models",
        description = "Get a list of all available AI models",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Models retrieved successfully",
                content = @Content(array = @ArraySchema(schema = @Schema(implementation = AIModelResponse.class)))
            )
        }
    )
    public ResponseEntity<List<AIModelResponse>> getAllModels() {
        List<AIModelResponse> models = aiModelService.getAllModels();
        return ResponseEntity.ok(models);
    }

    @GetMapping("/active")
    @Operation(
        summary = "List active AI models",
        description = "Get a list of currently active AI models",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Active models retrieved successfully",
                content = @Content(array = @ArraySchema(schema = @Schema(implementation = AIModelResponse.class)))
            )
        }
    )
    public ResponseEntity<List<AIModelResponse>> getActiveModels() {
        List<AIModelResponse> models = aiModelService.getActiveModels();
        return ResponseEntity.ok(models);
    }

    @GetMapping("/{id}")
    @Operation(
        summary = "Get AI model by ID",
        description = "Get details of a specific AI model by its ID",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Model retrieved successfully",
                content = @Content(schema = @Schema(implementation = AIModelResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Model not found")
        }
    )
    public ResponseEntity<AIModelResponse> getModelById(@PathVariable UUID id) {
        AIModelResponse model = aiModelService.getModelById(id);
        return ResponseEntity.ok(model);
    }

    @GetMapping("/name/{name}")
    @Operation(
        summary = "Get AI model by name",
        description = "Get details of a specific AI model by its name",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Model retrieved successfully",
                content = @Content(schema = @Schema(implementation = AIModelResponse.class))
            ),
            @ApiResponse(responseCode = "404", description = "Model not found")
        }
    )
    public ResponseEntity<AIModelResponse> getModelByName(@PathVariable String name) {
        AIModelResponse model = aiModelService.getModelByName(name);
        return ResponseEntity.ok(model);
    }
}
