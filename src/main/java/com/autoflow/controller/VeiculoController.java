package com.autoflow.controller;

import com.autoflow.model.ServiceOrder;
import com.autoflow.model.Veiculo;
import com.autoflow.repository.ServiceOrderRepository;
import com.autoflow.repository.VeiculoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/veiculos")
@CrossOrigin(origins = "*")
public class VeiculoController {

    @Autowired
    private VeiculoRepository veiculoRepository;

    @Autowired
    private ServiceOrderRepository orderRepository;

    @GetMapping("/placa/{placa}")
    public ResponseEntity<Veiculo> buscarPorPlaca(@PathVariable String placa) {
        String placaUpper = placa.toUpperCase();
        
        // 1. Tenta buscar na tabela de veículos
        return veiculoRepository.findByPlaca(placaUpper)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    // 2. Fallback inteligente: se não achar, procura nas OSs antigas
                    ServiceOrder osAntiga = orderRepository.findAll().stream()
                            .filter(o -> o.getVehiclePlate() != null && o.getVehiclePlate().equalsIgnoreCase(placaUpper))
                            .findFirst()
                            .orElse(null);

                    if (osAntiga != null) {
                        Veiculo novoVeiculo = new Veiculo();
                        novoVeiculo.setPlaca(osAntiga.getVehiclePlate());
                        novoVeiculo.setModelo(osAntiga.getVehicleModel());
                        novoVeiculo.setClienteNome(osAntiga.getCustomerName());
                        novoVeiculo.setClienteTelefone(osAntiga.getCustomerPhone());
                        veiculoRepository.save(novoVeiculo);
                        return ResponseEntity.ok(novoVeiculo);
                    }

                    return ResponseEntity.notFound().build();
                });
    }

    @PostMapping
    public Veiculo salvarOuAtualizar(@RequestBody Veiculo veiculo) {
        return veiculoRepository.findByPlaca(veiculo.getPlaca())
                .map(existente -> {
                    existente.setModelo(veiculo.getModelo());
                    existente.setClienteNome(veiculo.getClienteNome());
                    existente.setClienteTelefone(veiculo.getClienteTelefone());
                    return veiculoRepository.save(existente);
                }).orElseGet(() -> veiculoRepository.save(veiculo));
    }
}