package Sentina.demo.controller;

import Sentina.demo.models.Payment;
import Sentina.demo.models.AuditAction;
import Sentina.demo.repository.InvestigationRepository;
import Sentina.demo.repository.PaymentRepository;
import Sentina.demo.repository.RiskEvaluationRepository;
import Sentina.demo.repository.AuditActionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*", methods = {
    RequestMethod.GET, RequestMethod.PATCH, RequestMethod.DELETE, RequestMethod.OPTIONS
})
public class DashboardController {

    private final PaymentRepository paymentRepository;
    private final RiskEvaluationRepository riskEvaluationRepository;
    private final InvestigationRepository investigationRepository;
    private final AuditActionRepository auditActionRepository;
    @Value("${sentinel.auth.enabled:false}")
    private boolean authEnabled;
    @Value("${sentinel.auth.admin-token:change-me}")
    private String adminToken;

    public DashboardController(PaymentRepository paymentRepository,
                               RiskEvaluationRepository riskEvaluationRepository,
                               InvestigationRepository investigationRepository,
                               AuditActionRepository auditActionRepository) {
        this.paymentRepository = paymentRepository;
        this.riskEvaluationRepository = riskEvaluationRepository;
        this.investigationRepository = investigationRepository;
        this.auditActionRepository = auditActionRepository;
    }

    @GetMapping("/payments")
    public ResponseEntity<?> getAllPayments(@RequestHeader(value = "X-Sentinel-Admin-Token", defaultValue = "") String token) {
        if (!authorized(token)) return ResponseEntity.status(401).body("Authentication required");
        return ResponseEntity.ok(paymentRepository.findAll());
    }

    @PatchMapping("/payments/{paymentId}/decision")
    public ResponseEntity<?> decidePayment(@PathVariable String paymentId,
                                            @RequestBody Map<String, String> decision,
                                            @RequestHeader(value = "X-Analyst-Id", defaultValue = "local-analyst") String analystId,
                                            @RequestHeader(value = "X-Sentinel-Admin-Token", defaultValue = "") String token) {
        if (!authorized(token)) return ResponseEntity.status(401).body("Authentication required");
        String action = decision.get("action");
        if (!"approve".equals(action) && !"block".equals(action)) {
            return ResponseEntity.badRequest().body("Decision must be approve or block");
        }

        return paymentRepository.findById(paymentId)
                .map(payment -> {
                    payment.setStatus("approve".equals(action) ? "approved" : "blocked");
                    payment.setSuggestedAction("approve".equals(action) ? "ALLOW" : "BLOCK");
                    auditActionRepository.save(new AuditAction(paymentId, action, analystId));
                    return ResponseEntity.ok(paymentRepository.save(payment));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/payments/{paymentId}/audit")
    public ResponseEntity<?> getAuditHistory(@PathVariable String paymentId,
                                             @RequestHeader(value = "X-Sentinel-Admin-Token", defaultValue = "") String token) {
        if (!authorized(token)) return ResponseEntity.status(401).body("Authentication required");
        return ResponseEntity.ok(auditActionRepository.findByPaymentIdOrderByCreatedAtDesc(paymentId));
    }

    @DeleteMapping("/payments")
    @Transactional
    public ResponseEntity<?> resetDashboard(@RequestHeader(value = "X-Sentinel-Admin-Token", defaultValue = "") String token) {
        if (!authorized(token)) return ResponseEntity.status(401).body("Authentication required");
        investigationRepository.deleteAllInBatch();
        riskEvaluationRepository.deleteAllInBatch();
        auditActionRepository.deleteAllInBatch();
        paymentRepository.deleteAllInBatch();
        return ResponseEntity.ok(Map.of("status", "RESET"));
    }

    private boolean authorized(String token) {
        return !authEnabled || adminToken.equals(token);
    }
}