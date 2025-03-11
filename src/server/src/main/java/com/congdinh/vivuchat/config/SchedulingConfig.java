package com.congdinh.vivuchat.config;

import com.congdinh.vivuchat.services.interfaces.IRefreshTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class SchedulingConfig {
    
    private final IRefreshTokenService refreshTokenService;

    @Scheduled(cron = "0 0 1 * * ?") // Run at 1:00 AM every day
    public void purgeExpiredTokens() {
        log.info("Running scheduled task: Purging expired refresh tokens");
        refreshTokenService.purgeExpiredTokens();
    }
}
