package Sentina.demo.service;

import Sentina.demo.models.Investigation;
import Sentina.demo.models.Payment;
import Sentina.demo.models.RiskEvaluation;
import Sentina.demo.repository.InvestigationRepository;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.stream.Collectors;

@Service
public class AiInvestigatorService {

    private final InvestigationRepository investigationRepository;

    public AiInvestigatorService(InvestigationRepository investigationRepository) {
        this.investigationRepository = investigationRepository;
    }

    public Investigation investigate(Payment payment, RiskEvaluation evaluation) {
        Investigation investigation = new Investigation();
        investigation.setPaymentId(payment.getPaymentId());

        String action = "ALLOW";
        String recommendation;
        if ("CRITICAL".equals(evaluation.getRiskLevel())) {
            action = "BLOCK";
            recommendation = "Block this payment and investigate the customer before fulfillment.";
        } else if ("HIGH".equals(evaluation.getRiskLevel()) || "MEDIUM".equals(evaluation.getRiskLevel())) {
            action = "REVIEW";
            recommendation = "Hold fulfillment and review the payment signals manually.";
        } else {
            recommendation = "No high-risk pattern reached the review threshold. Payment can proceed.";
        }

        String signals = evaluation.getTriggeredSignals() == null || evaluation.getTriggeredSignals().isBlank()
                ? "- No risk signals detected"
                : Arrays.stream(evaluation.getTriggeredSignals().split(", "))
                        .map(signal -> "- " + signal.replace('_', ' '))
                        .collect(Collectors.joining("\n"));
        String summary = "Payment: " + payment.getPaymentId()
                + "\nCustomer: " + (payment.getCustomerId() == null ? "Unknown" : payment.getCustomerId())
                + "\nRisk: " + evaluation.getRiskLevel() + " (" + evaluation.getRiskScore() + "/100)"
                + "\nDecision: " + action
                + "\n\nSignals:\n" + signals
                + "\n\nRecommendation:\n" + recommendation;

        investigation.setEvidenceSummary(summary);
        investigation.setSuggestedAction(action);

        return investigationRepository.save(investigation);
    }
}