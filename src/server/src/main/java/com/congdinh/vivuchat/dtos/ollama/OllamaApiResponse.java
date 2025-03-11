package com.congdinh.vivuchat.dtos.ollama;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OllamaApiResponse {
    // Explicitly specify the generic type
    private List<OllamaModelResponse> models;
    private String status;
    
    // For show response
    private String modelfile;
    private String parameters;
    private String template;
    private OllamaModelDetails details;
    private Object model_info;
}
