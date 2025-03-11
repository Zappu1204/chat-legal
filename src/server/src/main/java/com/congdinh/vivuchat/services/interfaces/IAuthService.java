package com.congdinh.vivuchat.services.interfaces;

import com.congdinh.vivuchat.dtos.requests.LoginRequest;
import com.congdinh.vivuchat.dtos.responses.JwtResponse;

public interface IAuthService {
    JwtResponse authenticateUser(LoginRequest loginRequest);
}
