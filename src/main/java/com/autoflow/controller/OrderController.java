package com.autoflow.controller;

import com.autoflow.model.ServiceOrder;
import com.autoflow.repository.ServiceOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    @Autowired
    private ServiceOrderRepository orderRepository;

    @GetMapping
    public List<ServiceOrder> listarTodas() {
        return orderRepository.findAll();
    }

    // Rota unificada de busca de veículo por placa direto nas OSs existentes
    @GetMapping("/veiculo/{placa}")
    public ResponseEntity<ServiceOrder> buscarPorPlaca(@PathVariable String placa) {
        String placaUpper = placa.toUpperCase().trim();
        return orderRepository.findAll().stream()
                .filter(o -> o.getVehiclePlate() != null && o.getVehiclePlate().toUpperCase().trim().equals(placaUpper))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ServiceOrder criarOS(@RequestBody ServiceOrder order) {
        return orderRepository.save(order);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceOrder> atualizarOS(@PathVariable Long id, @RequestBody ServiceOrder orderDetails) {
        return orderRepository.findById(id).map(order -> {
            order.setCustomerName(orderDetails.getCustomerName());
            order.setCustomerPhone(orderDetails.getCustomerPhone());
            order.setVehiclePlate(orderDetails.getVehiclePlate());
            order.setVehicleModel(orderDetails.getVehicleModel());
            order.setServiceDescription(orderDetails.getServiceDescription());
            order.setTotalValue(orderDetails.getTotalValue());
            ServiceOrder updated = orderRepository.save(order);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ServiceOrder> atualizarStatus(@PathVariable Long id, @RequestParam String status) {
        return orderRepository.findById(id).map(order -> {
            order.setStatus(status);
            ServiceOrder updated = orderRepository.save(order);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletarOS(@PathVariable Long id) {
        if (orderRepository.existsById(id)) {
            orderRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}