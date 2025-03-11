package com.congdinh.vivuchat;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

@Slf4j
@SpringBootApplication
@EnableScheduling
public class VivuchatApplication {

    public static void main(String[] args) {
        SpringApplication.run(VivuchatApplication.class, args);
    }
    
    @Bean
    CommandLineRunner logStartup() {
        return args -> {
            log.info("=================================================");
            log.info("ViVuChat application started successfully!");
            log.info("=================================================");
            log.info("API available at: http://localhost:8080/api");
            log.info("Basic API docs at: http://localhost:8080/api-docs");
        };
    }
}
