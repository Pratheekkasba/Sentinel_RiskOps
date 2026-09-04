package Sentina.demo.controller;

import Sentina.demo.models.Investigation;
import Sentina.demo.models.Payment;
import Sentina.demo.models.RiskEvaluation;
import Sentina.demo.repository.PaymentRepository;
import Sentina.demo.service.AiInvestigatorService;
import Sentina.demo.service.RiskEngineService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;

import java.math.BigDecimal;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final BigDecimal MAX_TRANSACTION_AMOUNT_PAISE = new BigDecimal("50000000");

    private final PaymentRepository paymentRepository;
    private final RiskEngineService riskEngineService;
    private final AiInvestigatorService aiInvestigatorService;
    private final ObjectMapper objectMapper;
    private final boolean signatureEnabled;
    private final String webhookSecret;

    public WebhookController(PaymentRepository paymentRepository,
                             RiskEngineService riskEngineService,
                             AiInvestigatorService aiInvestigatorService,
                             ObjectMapper objectMapper,
                             @Value("${sentinel.webhook.signature.enabled:false}") boolean signatureEnabled,
                             @Value("${sentinel.webhook.secret:change-me}") String webhookSecret) {
        this.paymentRepository = paymentRepository;
        this.riskEngineService = riskEngineService;
        this.aiInvestigatorService = aiInvestigatorService;
        this.objectMapper = objectMapper;
        this.signatureEnabled = signatureEnabled;
        this.webhookSecret = webhookSecret;
    }

    @PostMapping("/razorpay")
    public ResponseEntity<?> handleRazorpayWebhook(@RequestBody String rawPayload,
                                                   HttpServletRequest request) {
        try {
            if (signatureEnabled && !validSignature(rawPayload, request.getHeader("X-Razorpay-Signature"))) {
                return ResponseEntity.status(401).body("Invalid webhook signature");
            }
            Object parsedPayload = objectMapper.readValue(rawPayload, Object.class);
            if (parsedPayload instanceof List<?> payloads) {
                List<Map<String, Object>> results = new ArrayList<>();
                for (Object payload : payloads) {
                    if (!(payload instanceof Map<?, ?> event)) {
                        results.add(Map.of("status", "INVALID", "message", "Each batch item must be an event object"));
                        continue;
                    }
                    @SuppressWarnings("unchecked")
                    Map<String, Object> typedEvent = (Map<String, Object>) event;
                    results.add(processEvent(typedEvent, request));
                }
                return ResponseEntity.ok(Map.of(
                        "status", "BATCH_PROCESSED",
                        "count", results.size(),
                        "results", results
                ));
            }

            if (!(parsedPayload instanceof Map<?, ?> event)) {
                return ResponseEntity.badRequest().body("Invalid Event Payload");
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = (Map<String, Object>) event;
            return responseFor(processEvent(payload, request));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    private ResponseEntity<?> responseFor(Map<String, Object> result) {
        String status = String.valueOf(result.get("status"));
        if ("INVALID".equals(status)) return ResponseEntity.badRequest().body(result.get("message"));
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> processEvent(Map<String, Object> payload, HttpServletRequest request) {
            Map<String, Object> paymentEntity = extractPaymentEntity(payload);
            
            if (paymentEntity != null) {
                String paymentId = (String) paymentEntity.get("id");
                if (paymentId == null || paymentRepository.existsById(paymentId)) {
                    return Map.of("status", "DUPLICATE", "paymentId", paymentId == null ? "" : paymentId);
                }
                Payment payment = new Payment();
                payment.setPaymentId(paymentId);
                payment.setOrderId((String) paymentEntity.get("order_id"));
                payment.setStatus((String) paymentEntity.get("status"));
                payment.setPaymentMethod((String) paymentEntity.get("method"));
                
                Object amountObj = paymentEntity.get("amount");
                if (amountObj != null) {
                    payment.setAmount(new BigDecimal(amountObj.toString()));
                }

                if (payment.getAmount() == null || payment.getAmount().signum() <= 0) {
                    return Map.of("status", "INVALID", "message", "Amount must be greater than zero");
                }
                if (payment.getAmount().compareTo(MAX_TRANSACTION_AMOUNT_PAISE) > 0) {
                    return Map.of("status", "INVALID", "message", "Maximum transaction amount is Rs 5,00,000");
                }

                payment.setCustomerId((String) paymentEntity.get("email"));
                if (paymentEntity.containsKey("is_fraud")) {
                    payment.setGroundTruthFraud((Boolean) paymentEntity.get("is_fraud"));
                }

                payment.setIpAddress(resolveClientIp(request));

                payment.setContactNumber((String) paymentEntity.get("contact"));
                payment.setUserAgent((String) paymentEntity.get("user_agent"));
                payment.setErrorReason((String) paymentEntity.get("error_reason"));

                @SuppressWarnings("unchecked")
                Map<String, Object> cardObj = (Map<String, Object>) paymentEntity.get("card");
                if (cardObj != null) {
                    payment.setCardNetwork((String) cardObj.get("network"));
                    payment.setCardType((String) cardObj.get("type"));
                    payment.setIssuerBank((String) cardObj.get("issuer"));
                    payment.setInternational((Boolean) cardObj.get("international"));
                } else {
                    payment.setCardNetwork((String) paymentEntity.get("card_network"));
                    payment.setCardType((String) paymentEntity.get("card_type"));
                    payment.setIssuerBank((String) paymentEntity.get("issuer_bank"));
                    payment.setInternational((Boolean) paymentEntity.get("international"));
                }

                Payment savedPayment = paymentRepository.save(payment);
                RiskEvaluation eval = riskEngineService.evaluate(savedPayment);
                Investigation investigation = aiInvestigatorService.investigate(savedPayment, eval);

                savedPayment.setRiskScore(eval.getRiskScore());
                savedPayment.setRiskConfidence(eval.getConfidence());
                savedPayment.setRiskLevel(eval.getRiskLevel());
                savedPayment.setTriggeredSignals(eval.getTriggeredSignals());
                savedPayment.setEvidenceSummary(investigation.getEvidenceSummary());
                savedPayment.setSuggestedAction(investigation.getSuggestedAction());
                paymentRepository.save(savedPayment);

                return Map.of(
                    "status", "PROCESSED",
                    "paymentId", savedPayment.getPaymentId(),
                    "riskScore", eval.getRiskScore(),
                    "confidence", eval.getConfidence(),
                    "riskLevel", eval.getRiskLevel(),
                    "signals", eval.getTriggeredSignals() != null ? eval.getTriggeredSignals() : "",
                    "evidenceSummary", investigation.getEvidenceSummary(),
                    "suggestedAction", investigation.getSuggestedAction()
                );
            }

            return Map.of("status", "INVALID", "message", "Invalid Event Payload");
    }

    private boolean validSignature(String payload, String suppliedSignature) throws Exception {
        if (suppliedSignature == null || suppliedSignature.isBlank()) return false;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte value : digest) hex.append(String.format("%02x", value));
        return java.security.MessageDigest.isEqual(hex.toString().getBytes(StandardCharsets.UTF_8), suppliedSignature.getBytes(StandardCharsets.UTF_8));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractPaymentEntity(Map<String, Object> payload) {
        Map<String, Object> payloadData = (Map<String, Object>) payload.get("payload");
        if (payloadData != null) {
            Map<String, Object> paymentObj = (Map<String, Object>) payloadData.get("payment");
            if (paymentObj != null) {
                return (Map<String, Object>) paymentObj.get("entity");
            }
        }
        return null;
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String remoteAddress = request.getRemoteAddr();
        return "0:0:0:0:0:0:0:1".equals(remoteAddress) ? "127.0.0.1" : remoteAddress;
    }

    
}