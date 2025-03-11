package com.congdinh.vivuchat.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Slf4j
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient ollamaWebClient(OllamaConfig ollamaConfig) {
        // Create a connection provider with proper connection pooling
        ConnectionProvider provider = ConnectionProvider.builder("ollama-connection-pool")
                .maxConnections(50)
                .maxIdleTime(Duration.ofSeconds(30))
                .maxLifeTime(Duration.ofMinutes(5))
                .pendingAcquireTimeout(Duration.ofSeconds(60))
                .evictInBackground(Duration.ofSeconds(120))
                .build();

        // Create HTTP client with timeouts and connection pool
        HttpClient httpClient = HttpClient.create(provider)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, ollamaConfig.getTimeoutSeconds() * 1000)
                .responseTimeout(Duration.ofSeconds(ollamaConfig.getTimeoutSeconds()))
                .doOnConnected(conn -> 
                    conn.addHandlerLast(new ReadTimeoutHandler(ollamaConfig.getTimeoutSeconds(), TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(ollamaConfig.getTimeoutSeconds(), TimeUnit.SECONDS)));

        // Increase memory buffer size to handle larger responses
        ExchangeStrategies exchangeStrategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024)) // 16MB buffer
                .build();

        return WebClient.builder()
                .baseUrl(ollamaConfig.getApiUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .exchangeStrategies(exchangeStrategies)
                .filter(logRequest())
                .filter(logResponse())
                .filter(handleErrors())
                .build();
    }
    
    // Request logging filter
    private ExchangeFilterFunction logRequest() {
        return ExchangeFilterFunction.ofRequestProcessor(clientRequest -> {
            log.debug("Request: {} {}", clientRequest.method(), clientRequest.url());
            return Mono.just(clientRequest);
        });
    }
    
    // Response logging filter
    private ExchangeFilterFunction logResponse() {
        return ExchangeFilterFunction.ofResponseProcessor(clientResponse -> {
            log.debug("Response status: {}", clientResponse.statusCode());
            return Mono.just(clientResponse);
        });
    }
    
    // Error handling filter
    private ExchangeFilterFunction handleErrors() {
        return ExchangeFilterFunction.ofResponseProcessor(clientResponse -> {
            if (clientResponse.statusCode().isError()) {
                return clientResponse.bodyToMono(String.class)
                        .defaultIfEmpty("No response body")
                        .flatMap(errorBody -> {
                            log.error("Error response: {} - {}", clientResponse.statusCode(), errorBody);
                            return Mono.just(clientResponse);
                        });
            } else {
                return Mono.just(clientResponse);
            }
        });
    }
}
