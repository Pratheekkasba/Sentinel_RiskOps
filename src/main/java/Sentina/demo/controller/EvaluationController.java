package Sentina.demo.controller;

import Sentina.demo.service.ModelEvaluationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/evaluation")
@CrossOrigin(origins = "*")
public class EvaluationController {

    private final ModelEvaluationService modelEvaluationService;

    public EvaluationController(ModelEvaluationService modelEvaluationService) {
        this.modelEvaluationService = modelEvaluationService;
    }

    @GetMapping("/benchmark")
    public ResponseEntity<Map<String, Object>> benchmark() {
        return ResponseEntity.ok(modelEvaluationService.evaluate());
    }
}
