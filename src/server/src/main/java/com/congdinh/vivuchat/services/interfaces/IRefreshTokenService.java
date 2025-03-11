package com.congdinh.vivuchat.services.interfaces;

import com.congdinh.vivuchat.entities.RefreshToken;
import com.congdinh.vivuchat.entities.User;

import java.util.List;
import java.util.Optional;

public interface IRefreshTokenService {
    Optional<RefreshToken> findByToken(String token);
    RefreshToken createRefreshToken(User user);
    RefreshToken verifyExpiration(RefreshToken token);
    RefreshToken useToken(RefreshToken token, String replacedByToken);
    void revokeToken(RefreshToken token, String reason);
    void deleteByUser(User user);
    List<RefreshToken> findActiveTokensByUser(User user);
    void purgeExpiredTokens();
}
