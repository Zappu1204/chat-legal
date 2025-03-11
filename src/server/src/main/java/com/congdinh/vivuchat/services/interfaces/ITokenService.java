package com.congdinh.vivuchat.services.interfaces;

import com.congdinh.vivuchat.security.UserDetailsImpl;
import org.springframework.security.core.Authentication;

public interface ITokenService {
    String generateAccessToken(UserDetailsImpl userPrincipal);
    String generateRefreshToken(UserDetailsImpl userPrincipal);
    String getUsernameFromToken(String token);
    boolean validateToken(String token);
    Authentication getAuthentication(String token);
}
