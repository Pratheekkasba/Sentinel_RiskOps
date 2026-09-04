package Sentina.demo.service;

import Sentina.demo.models.Investigation;
import Sentina.demo.models.Payment;
import Sentina.demo.models.RiskEvaluation;
import Sentina.demo.repository.PaymentRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

@Service
public class PaymentRiskBackfillService {

    private final PaymentRepository paymentRepository;
    private final RiskEngineService riskEngineService;
    private final AiInvestigatorService aiInvestigatorService;

    public PaymentRiskBackfillService(PaymentRepository paymentRepository,
                                      RiskEngineService riskEngineService,
                                      AiInvestigatorService aiInvestigatorService) {
        this.paymentRepository = paymentRepository;
        this.riskEngineService = riskEngineService;
        this.aiInvestigatorService = aiInvestigatorService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void evaluateUnscoredPayments() {
        paymentRepository.findAll().stream()
            .filter(payment -> payment.getRiskLevel() == null
                || payment.getEvidenceSummary() == null
                || payment.getEvidenceSummary().startsWith("AI Risk Analysis for Payment"))
                .forEach(this::evaluate);
    }

    private void evaluate(Payment payment) {
        RiskEvaluation evaluation = riskEngineService.evaluate(payment);
        Investigation investigation = aiInvestigatorService.investigate(payment, evaluation);

        payment.setRiskScore(evaluation.getRiskScore());
        payment.setRiskConfidence(evaluation.getConfidence());
        payment.setRiskLevel(evaluation.getRiskLevel());
        payment.setTriggeredSignals(evaluation.getTriggeredSignals());
        payment.setEvidenceSummary(investigation.getEvidenceSummary());
        payment.setSuggestedAction(investigation.getSuggestedAction());
        paymentRepository.save(payment);
    }
}
