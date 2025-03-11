package com.congdinh.vivuchat.config;

import com.congdinh.vivuchat.entities.Role;
import com.congdinh.vivuchat.entities.User;
import com.congdinh.vivuchat.repositories.IRoleRepository;
import com.congdinh.vivuchat.repositories.IUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final IRoleRepository roleRepository;
    private final IUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner initData() {
        return args -> {
            // Create roles if they don't exist
            initRoles();
            
            // Create admin user if it doesn't exist
            initAdminUser();
        };
    }

    private void initRoles() {
        if (!roleRepository.existsByName("ROLE_ADMIN")) {
            roleRepository.save(Role.builder()
                    .name("ROLE_ADMIN")
                    .description("Administrator role")
                    .build());
            log.info("Admin role created");
        }
        
        if (!roleRepository.existsByName("ROLE_USER")) {
            roleRepository.save(Role.builder()
                    .name("ROLE_USER")
                    .description("Regular user role")
                    .build());
            log.info("User role created");
        }
    }

    private void initAdminUser() {
        if (!userRepository.existsByUsername("admin")) {
            try {
                UUID adminRoleId = roleRepository.findByName("ROLE_ADMIN")
                        .map(Role::getId)
                        .orElseThrow(() -> new RuntimeException("Admin role not found"));
                
                Role adminRole = Role.builder()
                        .id(adminRoleId)
                        .name("ROLE_ADMIN")
                        .build();
                
                Set<Role> roles = new HashSet<>();
                roles.add(adminRole);
                
                User admin = User.builder()
                        .username("admin")
                        .email("admin@example.com")
                        .password(passwordEncoder.encode("admin123"))
                        .phoneNumber("+1234567890")
                        .roles(roles)
                        .build();
                
                userRepository.save(admin);
                log.info("Admin user created");
            } catch (Exception e) {
                log.error("Error creating admin user: {}", e.getMessage(), e);
            }
        }
    }
}
