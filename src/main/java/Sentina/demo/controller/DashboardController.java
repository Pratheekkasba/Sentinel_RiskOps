package Sentina.demo.controller;

import Sentina.demo.models.AuditAction;
import Sentina.demo.models.Payment;
import Sentina.demo.models.User;
import Sentina.demo.repository.InvestigationRepository;
import Sentina.demo.repository.PaymentRepository;
import Sentina.demo.repository.RiskEvaluationRepository;
import Sentina.demo.repository.AuditActionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

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
    @PreAuthorize("hasAnyRole('ANALYST', 'ADMIN')")
    public ResponseEntity<?> getAllPayments() {
        return ResponseEntity.ok(paymentRepository.findAll());
    }

    @PatchMapping("/payments/{paymentId}/decision")
    @PreAuthorize("hasAnyRole('ANALYST', 'ADMIN')")
    public ResponseEntity<?> decidePayment(
            @PathVariable String paymentId,
            @RequestBody Map<String, String> decision,
            @AuthenticationPrincipal User currentUser) {

        String action = decision.get("action");
        if (!"approve".equals(action) && !"block".equals(action)) {
            return ResponseEntity.badRequest().body("Decision must be approve or block");
        }

        // Use the authenticated user's email as the analyst identifier
        String analystId = currentUser != null ? currentUser.getEmail() : "unknown";

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
    @PreAuthorize("hasAnyRole('ANALYST', 'ADMIN')")
    public ResponseEntity<?> getAuditHistory(@PathVariable String paymentId) {
        return ResponseEntity.ok(auditActionRepository.findByPaymentIdOrderByCreatedAtDesc(paymentId));
    }

    @DeleteMapping("/payments")
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> resetDashboard() {
        investigationRepository.deleteAllInBatch();
        riskEvaluationRepository.deleteAllInBatch();
        auditActionRepository.deleteAllInBatch();
        paymentRepository.deleteAllInBatch();
        return ResponseEntity.ok(Map.of("status", "RESET"));
    }
}