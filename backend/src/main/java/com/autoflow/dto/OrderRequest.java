package com.autoflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record OrderRequest(
    @NotBlank String customerName,
    @NotBlank String customerPhone,
    @NotBlank String vehiclePlate,
    @NotBlank String vehicleModel,
    @NotBlank String serviceDescription,
    @NotNull BigDecimal totalValue
) {}