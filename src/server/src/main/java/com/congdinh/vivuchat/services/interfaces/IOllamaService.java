package com.congdinh.vivuchat.services.interfaces;

import com.congdinh.vivuchat.dtos.ollama.OllamaCompletionResponse;

import java.util.List;
import java.util.Map;

public interface IOllamaService {
    OllamaCompletionResponse generateCompletion(String model, List<Map<String, String>> messages);
    String getSystemPrompt();
}
