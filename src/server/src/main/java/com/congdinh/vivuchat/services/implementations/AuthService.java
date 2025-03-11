package com.congdinh.vivuchat.services.implementations;

import com.congdinh.vivuchat.dtos.requests.LoginRequest;
import com.congdinh.vivuchat.dtos.responses.JwtResponse;
import com.congdinh.vivuchat.repositories.IUserRepository;
import com.congdinh.vivuchat.security.UserDetailsImpl;
import com.congdinh.vivuchat.services.interfaces.IAuthService;
import com.congdinh.vivuchat.services.interfaces.ITokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService implements UserDetailsService, IAuthService {

    private final IUserRepository userRepository;
    private final AuthenticationManagerBuilder authenticationManagerBuilder;
    private final ITokenService tokenService;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
                .map(user -> {
                    // Force initialization of roles inside transaction
                    user.getRoles().size();
                    return UserDetailsImpl.build(user);
                })
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
    }

    @Override
    public JwtResponse authenticateUser(LoginRequest loginRequest) {
        Authentication authentication = authenticationManagerBuilder.getObject().authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        String accessToken = tokenService.generateAccessToken(userDetails);
        String refreshToken = tokenService.generateRefreshToken(userDetails);

        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        return JwtResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .id(userDetails.getId())
                .username(userDetails.getUsername())
                .email(userDetails.getEmail())
                .roles(roles)
                .build();
    }
}
