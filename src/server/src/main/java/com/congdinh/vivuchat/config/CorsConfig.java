package com.congdinh.vivuchat.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class CorsConfig {

    @Value("${app.security.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Allow specified origins
        Arrays.stream(allowedOrigins.split(",")).forEach(config::addAllowedOrigin);
        
        // Allow credentials
        config.setAllowCredentials(true);
        
        // Allow common HTTP methods
        config.addAllowedMethod("GET");
        config.addAllowedMethod("POST");
        config.addAllowedMethod("PUT");
        config.addAllowedMethod("DELETE");
        config.addAllowedMethod("OPTIONS");
        
        // Allow common headers
        config.addAllowedHeader("Authorization");
        config.addAllowedHeader("Content-Type");
        config.addAllowedHeader("Accept");
        
        // Expose headers
        config.addExposedHeader("Authorization");
        
        // Apply to all paths
        source.registerCorsConfiguration("/api/**", config);
        
        // Special configuration for SSE endpoints
        CorsConfiguration sseConfig = new CorsConfiguration(config);
        sseConfig.addExposedHeader("Content-Type");
        source.registerCorsConfiguration("/api/ollama/chat/stream", sseConfig);
        
        return new CorsFilter(source);
    }
}
