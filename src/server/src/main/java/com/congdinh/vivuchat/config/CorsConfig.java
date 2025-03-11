package com.congdinh.vivuchat.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
@Order(Ordered.HIGHEST_PRECEDENCE) // Place this filter before the security filter chain
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
        config.addAllowedMethod("*");  // Simplify to accept all methods
        
        // Allow common headers
        config.addAllowedHeader("*");  // Simplify to accept all headers
        
        // Expose headers
        config.addExposedHeader("Authorization");
        config.addExposedHeader("Content-Type");
        
        // Apply to all paths
        source.registerCorsConfiguration("/**", config);  // Apply to all paths for simplicity
        
        return new CorsFilter(source);
    }
}
