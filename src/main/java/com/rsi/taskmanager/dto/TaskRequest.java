package com.rsi.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TaskRequest(
        @NotBlank @Size(max = 100) String title,
        @Size(max = 500) String description,
        boolean done) {
}
