package com.congdinh.vivuchat.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.ollama")
public class OllamaConfig {
    private String apiUrl = "http://localhost:11434/api";
    private int timeoutSeconds = 120;
    private boolean enableStreaming = true;
}
