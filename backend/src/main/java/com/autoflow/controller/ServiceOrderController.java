package com.autoflow.controller;

import com.autoflow.domain.ServiceOrder;
import com.autoflow.dto.OrderRequest;
import com.autoflow.repository.ServiceOrderRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/orders")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ServiceOrderController {

    private final ServiceOrderRepository repository;

    @GetMapping
    public ResponseEntity<List<ServiceOrder>> getAllOrders() {
        return ResponseEntity.ok(repository.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping
    public ResponseEntity<ServiceOrder> createOrder(@Valid @RequestBody OrderRequest request) {
        ServiceOrder order = ServiceOrder.builder()
                .customerName(request.customerName().trim())
                .customerPhone(request.customerPhone().replaceAll("\\D", ""))
                .vehiclePlate(request.vehiclePlate().toUpperCase().trim())
                .vehicleModel(request.vehicleModel().trim())
                .serviceDescription(request.serviceDescription().trim())
                .totalValue(request.totalValue())
                .status(ServiceOrder.OrderStatus.AGUARDANDO)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(order));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ServiceOrder> updateStatus(
            @PathVariable Long id,
            @RequestParam ServiceOrder.OrderStatus status) {
        ServiceOrder order = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordem não encontrada"));

        order.setStatus(status);
        return ResponseEntity.ok(repository.save(order));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordem não encontrada");
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}