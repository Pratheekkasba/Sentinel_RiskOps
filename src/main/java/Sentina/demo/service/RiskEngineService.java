package Sentina.demo.service;

import Sentina.demo.models.Payment;
import Sentina.demo.models.RiskEvaluation;
import Sentina.demo.repository.PaymentRepository;
import Sentina.demo.repository.RiskEvaluationRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class RiskEngineService {

    private final PaymentRepository paymentRepository;
    private final RiskEvaluationRepository riskEvaluationRepository;

    public RiskEngineService(PaymentRepository paymentRepository,
                             RiskEvaluationRepository riskEvaluationRepository) {
        this.paymentRepository = paymentRepository;
        this.riskEvaluationRepository = riskEvaluationRepository;
    }

    public RiskEvaluation evaluate(Payment payment) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime tenMinsAgo = now.minusMinutes(10);
        long velocityCount = paymentRepository.countByCustomerIdAndCreatedAtAfter(payment.getCustomerId(), tenMinsAgo);
        LocalDateTime thirtyMinsAgo = now.minusMinutes(30);
        long failedCount = paymentRepository.countByCustomerIdAndStatusAndCreatedAtAfter(
                payment.getCustomerId(), "failed", thirtyMinsAgo);
        long sharedIpCount = payment.getIpAddress() == null ? 0 : paymentRepository.countByIpAddressAndCreatedAtAfter(
                payment.getIpAddress(), now.minusHours(24));
        return toEvaluation(payment, score(payment, velocityCount, failedCount, sharedIpCount));
    }

        public RiskDecision score(Payment payment) {
        LocalDateTime now = LocalDateTime.now();
        long velocityCount = paymentRepository.countByCustomerIdAndCreatedAtAfter(
            payment.getCustomerId(), now.minusMinutes(10));
        long failedCount = paymentRepository.countByCustomerIdAndStatusAndCreatedAtAfter(
            payment.getCustomerId(), "failed", now.minusMinutes(30));
        long sharedIpCount = payment.getIpAddress() == null ? 0 : paymentRepository.countByIpAddressAndCreatedAtAfter(
            payment.getIpAddress(), now.minusHours(24));
        return score(payment, velocityCount, failedCount, sharedIpCount);
        }

    public RiskDecision score(Payment payment, long velocityCount, long failedCount, long sharedIpCount) {
        int score = 0;
        List<String> signals = new ArrayList<>();

        if (velocityCount >= 4) {
            score += 35;
            signals.add("HIGH_VELOCITY_10M (" + velocityCount + " txns)");
        } else if (velocityCount >= 2) {
            score += 15 + (int) ((velocityCount - 2) * 10);
            signals.add("ELEVATED_VELOCITY_10M (" + velocityCount + " txns)");
        }

        if (failedCount >= 3) {
            score += 30;
            signals.add("MULTIPLE_FAILED_ATTEMPTS (" + failedCount + " failures)");
        } else if (failedCount >= 1) {
            score += 12;
            signals.add("RECENT_FAILED_ATTEMPT (" + failedCount + " failure)");
        }

        if (payment.getAmount() != null && payment.getAmount().compareTo(new BigDecimal("10000000")) >= 0) {
            score += 25;
            signals.add("HIGH_VALUE_TRANSACTION");
        }

        if (sharedIpCount >= 4) {
            score += 20;
            signals.add("SHARED_IP_ACTIVITY_24H (" + sharedIpCount + " txns)");
        } else if (sharedIpCount >= 2) {
            score += 10;
            signals.add("REPEATED_IP_ACTIVITY_24H (" + sharedIpCount + " txns)");
        }

        if (Boolean.TRUE.equals(payment.getInternational())) {
            score += 10;
            signals.add("INTERNATIONAL_TRANSACTION");
        }
        if ("prepaid".equalsIgnoreCase(payment.getCardType())) {
            score += 8;
            signals.add("PREPAID_CARD");
        }
        if (payment.getCardNetwork() == null || "unknown".equalsIgnoreCase(payment.getCardNetwork())) {
            score += 5;
            signals.add("UNKNOWN_CARD_NETWORK");
        }
        if (payment.getCustomerId() == null || payment.getCustomerId().isBlank()) {
            score += 8;
            signals.add("MISSING_CUSTOMER_PROFILE");
        }
        if ("failed".equalsIgnoreCase(payment.getStatus())) {
            score += 10;
            signals.add("PAYMENT_FAILED");
        }

        score = Math.min(score, 100);
        String level = score >= 70 ? "CRITICAL" : score >= 40 ? "HIGH" : score >= 20 ? "MEDIUM" : "LOW";
        int confidence = Math.min(98, 62 + signals.size() * 6);
        return new RiskDecision(score, confidence, level, String.join(", ", signals));
    }

    private RiskEvaluation toEvaluation(Payment payment, RiskDecision decision) {
        RiskEvaluation eval = new RiskEvaluation();
        eval.setPaymentId(payment.getPaymentId());
        eval.setRiskScore(decision.score());
        eval.setConfidence(decision.confidence());
        eval.setRiskLevel(decision.level());
        eval.setTriggeredSignals(decision.signals());

        return riskEvaluationRepository.save(eval);
    }

    public record RiskDecision(int score, int confidence, String level, String signals) { }
}