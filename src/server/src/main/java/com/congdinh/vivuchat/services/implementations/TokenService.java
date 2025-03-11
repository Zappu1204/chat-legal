package com.congdinh.vivuchat.services.implementations;

import com.congdinh.vivuchat.config.JwtConfig;
import com.congdinh.vivuchat.security.UserDetailsImpl;
import com.congdinh.vivuchat.services.interfaces.ITokenService;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenService implements ITokenService {

    private final JwtConfig jwtConfig;

    @Override
    public String generateAccessToken(UserDetailsImpl userPrincipal) {
        return generateToken(userPrincipal, jwtConfig.getExpirationMs());
    }

    @Override
    public String generateRefreshToken(UserDetailsImpl userPrincipal) {
        return generateToken(userPrincipal, jwtConfig.getRefreshExpirationMs());
    }

    private String generateToken(UserDetailsImpl userPrincipal, long expirationMs) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", userPrincipal.getId().toString());
        claims.put("email", userPrincipal.getEmail());
        claims.put("roles", userPrincipal.getAuthorities());

        return Jwts.builder()
                .claims(claims)
                .subject(userPrincipal.getUsername())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    @Override
    public String getUsernameFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    @Override
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (SignatureException e) {
            log.error("Invalid JWT signature: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

     @Override
    public Authentication getAuthentication(String token) {
        if (token == null) {
            return null;
        }

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String roles = claims.get("roles").toString();

            Set<GrantedAuthority> authorities = Set.of(roles.split(",")).stream()
                    .map(SimpleGrantedAuthority::new).collect(Collectors.toSet());

            User priciple = new User(claims.getSubject(), "", authorities);

            return new UsernamePasswordAuthenticationToken(priciple, token, authorities);
        } catch (Exception e) {
            return null;
        }
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtConfig.getSecret());
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
