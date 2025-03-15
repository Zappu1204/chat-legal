package com.congdinh.vivuchat.services.implementations;

import com.congdinh.vivuchat.dtos.requests.LoginRequest;
import com.congdinh.vivuchat.dtos.requests.LogoutRequest;
import com.congdinh.vivuchat.dtos.requests.RefreshTokenRequest;
import com.congdinh.vivuchat.dtos.requests.RegisterRequest;
import com.congdinh.vivuchat.dtos.responses.JwtResponse;
import com.congdinh.vivuchat.entities.RefreshToken;
import com.congdinh.vivuchat.entities.Role;
import com.congdinh.vivuchat.entities.User;
import com.congdinh.vivuchat.exceptions.TokenRefreshException;
import com.congdinh.vivuchat.repositories.IRoleRepository;
import com.congdinh.vivuchat.repositories.IUserRepository;
import com.congdinh.vivuchat.security.UserDetailsImpl;
import com.congdinh.vivuchat.services.interfaces.IAuthService;
import com.congdinh.vivuchat.services.interfaces.IRefreshTokenService;
import com.congdinh.vivuchat.services.interfaces.ITokenService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.congdinh.vivuchat.dtos.responses.MessageResponse;

@Slf4j
@Service
public class AuthService implements UserDetailsService, IAuthService {

    private final IUserRepository userRepository;
    private final IRoleRepository roleRepository;
    private final ITokenService tokenService;
    private final IRefreshTokenService refreshTokenService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectProvider<AuthenticationManager> authenticationManagerProvider;

    public AuthService(
            IUserRepository userRepository, 
            IRoleRepository roleRepository, 
            ITokenService tokenService,
            IRefreshTokenService refreshTokenService,
            PasswordEncoder passwordEncoder,
            ObjectProvider<AuthenticationManager> authenticationManagerProvider) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.tokenService = tokenService;
        this.refreshTokenService = refreshTokenService;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManagerProvider = authenticationManagerProvider;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // return userRepository.findByUsername(username)
        //         .map(user -> {
        //             // Force initialization of roles inside transaction
        //             int rolesSize = user.getRoles().size();
        //             log.debug("User roles size: {}", rolesSize);
        //             return UserDetailsImpl.build(user);
        //         })
        //         .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User Not Found with username: " + username));
            
        // Check if account is active
        if (!user.getIsActive()) {
            log.warn("Failed login attempt for inactive account: {}", username);
            throw new RuntimeException("Account is deactivated");
        }
        
        // Check if account is locked
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            log.warn("Failed login attempt for locked account: {}", username);
            throw new RuntimeException("Account is temporarily locked until " + user.getLockedUntil());
        }
        
        return UserDetailsImpl.build(user);
    }

    @Override
    @Transactional
    public JwtResponse authenticateUser(LoginRequest loginRequest) {
        try {
            // Get authentication manager lazily to avoid circular dependency
            AuthenticationManager authenticationManager = authenticationManagerProvider.getObject();
            
            // Authenticate
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

            // Generate JWT access token
            String accessToken = tokenService.generateAccessToken(userDetails);
            
            // Get user for refresh token
            User user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + userDetails.getUsername()));
            
            // Create refresh token with retry mechanism
            RefreshToken refreshToken;
            try {
                refreshToken = refreshTokenService.createRefreshToken(user);
            } catch (DataIntegrityViolationException ex) {
                // If we hit a constraint violation, try to find existing token
                log.warn("Constraint violation creating refresh token, checking for existing tokens");
                List<RefreshToken> activeTokens = refreshTokenService.findActiveTokensByUser(user);
                if (activeTokens.isEmpty()) {
                    throw new RuntimeException("Could not create or find valid refresh token");
                }
                refreshToken = activeTokens.get(0);
            }

            List<String> roles = userDetails.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .toList();

            return JwtResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken.getToken())
                    .id(userDetails.getId())
                    .username(userDetails.getUsername())
                    .email(userDetails.getEmail())
                    .roles(roles)
                    .build();
        } catch (Exception e) {
            log.error("Authentication error: ", e);
            throw e;
        }
    }
    
    @Override
    @Transactional
    public JwtResponse refreshToken(RefreshTokenRequest refreshTokenRequest) {
        String requestRefreshToken = refreshTokenRequest.getRefreshToken();
        
        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(refreshToken -> {
                    User user = refreshToken.getUser();
                    UserDetailsImpl userDetails = UserDetailsImpl.build(user);
                    
                    // Generate new access token
                    String accessToken = tokenService.generateAccessToken(userDetails);
                    
                    // Generate new refresh token with retry mechanism
                    RefreshToken newRefreshToken;
                    try {
                        newRefreshToken = refreshTokenService.createRefreshToken(user);
                    } catch (DataIntegrityViolationException ex) {
                        // If we hit a constraint violation, try to find an active token
                        List<RefreshToken> activeTokens = refreshTokenService.findActiveTokensByUser(user);
                        if (activeTokens.isEmpty()) {
                            throw new TokenRefreshException(requestRefreshToken, 
                                "Could not create new refresh token due to constraint violation");
                        }
                        newRefreshToken = activeTokens.get(0);
                    }
                    
                    // Mark old token as used and specify which token replaced it
                    refreshTokenService.useToken(refreshToken, newRefreshToken.getToken());

                    List<String> roles = userDetails.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .toList();
                    
                    return JwtResponse.builder()
                            .accessToken(accessToken)
                            .refreshToken(newRefreshToken.getToken())
                            .id(userDetails.getId())
                            .username(userDetails.getUsername())
                            .email(userDetails.getEmail())
                            .roles(roles)
                            .build();
                })
                .orElseThrow(() -> new TokenRefreshException(requestRefreshToken, "Refresh token not found in database"));
    }

    @Override
    @Transactional
    public MessageResponse registerUser(RegisterRequest registerRequest) {
        if (existsByUsername(registerRequest.getUsername())) {
            return MessageResponse.builder()
                    .message("Username is already taken")
                    .success(false)
                    .build();
        }

        if (existsByEmail(registerRequest.getEmail())) {
            return MessageResponse.builder()
                    .message("Email is already in use")
                    .success(false)
                    .build();
        }

        // Create new user account
        User user = User.builder()
                .username(registerRequest.getUsername())
                .email(registerRequest.getEmail())
                .password(passwordEncoder.encode(registerRequest.getPassword()))
                .phoneNumber(registerRequest.getPhoneNumber())
                .build();

        Set<String> strRoles = registerRequest.getRoles();
        Set<Role> roles = new HashSet<>();

        if (strRoles == null || strRoles.isEmpty()) {
            Role userRole = roleRepository.findByName("ROLE_USER")
                    .orElseThrow(() -> new RuntimeException("Error: Role 'ROLE_USER' is not found."));
            roles.add(userRole);
        } else {
            strRoles.forEach(role -> {
                switch (role) {
                    case "admin" -> {
                        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                                .orElseThrow(() -> new RuntimeException("Error: Role 'ROLE_ADMIN' is not found."));
                        roles.add(adminRole);
                    }
                    case "mod" -> {
                        Role modRole = roleRepository.findByName("ROLE_MODERATOR")
                                .orElseThrow(() -> new RuntimeException("Error: Role 'ROLE_MODERATOR' is not found."));
                        roles.add(modRole);
                    }
                    default -> {
                        Role userRole = roleRepository.findByName("ROLE_USER")
                                .orElseThrow(() -> new RuntimeException("Error: Role 'ROLE_USER' is not found."));
                        roles.add(userRole);
                    }
                }
            });
        }

        user.setRoles(roles);
        userRepository.save(user);

        log.info("User registered successfully: {}", user.getUsername());
        
        return MessageResponse.builder()
                .message("User registered successfully!")
                .success(true)
                .build();
    }

    @Override
    @Transactional
    public MessageResponse logoutUser(LogoutRequest logoutRequest) {
        if (logoutRequest != null && logoutRequest.getUsername() != null) {
            userRepository.findByUsername(logoutRequest.getUsername())
                    .ifPresent(refreshTokenService::deleteByUser);
        }
        
        return MessageResponse.builder()
                .message("Logout successful")
                .success(true)
                .build();
    }

    @Override
    @Transactional
    public MessageResponse revokeToken(String token, String reason) {
        return refreshTokenService.findByToken(token)
                .map(refreshToken -> {
                    if (refreshToken.isRevoked()) {
                        return MessageResponse.builder()
                                .message("Token was already revoked")
                                .success(false)
                                .build();
                    }
                    
                    String finalReason = (reason != null && !reason.isBlank()) ? 
                            reason : "Manually revoked by user";
                    refreshTokenService.revokeToken(refreshToken, finalReason);
                    
                    log.info("Token revoked for user: {}, reason: {}", 
                            refreshToken.getUser().getUsername(), finalReason);
                            
                    return MessageResponse.builder()
                            .message("Token successfully revoked")
                            .success(true)
                            .build();
                })
                .orElse(MessageResponse.builder()
                        .message("Token not found")
                        .success(false)
                        .build());
    }

    @Override
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
}
