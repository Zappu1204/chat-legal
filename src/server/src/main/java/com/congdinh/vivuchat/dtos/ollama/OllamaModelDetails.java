package com.congdinh.vivuchat.dtos.ollama;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
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
public class OllamaModelDetails {
    private String format;
    private String family;
    private List<String> families;
    
    @JsonProperty("parameter_size")
    private String parameterSize;
    
    @JsonProperty("quantization_level")
    private String quantizationLevel;
    
    @JsonProperty("parent_model")
    private String parentModel;
}
