package Sentina.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import Sentina.demo.models.Payment;
import Sentina.demo.repository.PaymentRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ModelEvaluationService {

    private final RiskEngineService riskEngineService;
    private final PaymentRepository paymentRepository;
    private final BigDecimal falsePositiveCost;

    public ModelEvaluationService(RiskEngineService riskEngineService,
                                  PaymentRepository paymentRepository,
                                  @Value("${sentinel.evaluation.false-positive-cost:2500}") BigDecimal falsePositiveCost) {
        this.riskEngineService = riskEngineService;
        this.paymentRepository = paymentRepository;
        this.falsePositiveCost = falsePositiveCost;
    }

    public Map<String, Object> evaluate() {
        List<Payment> cases = paymentRepository.findByGroundTruthFraudNotNull();
        int truePositives = 0;
        int falsePositives = 0;
        int trueNegatives = 0;
        int falseNegatives = 0;

        for (Payment payment : cases) {
            RiskEngineService.RiskDecision decision = riskEngineService.score(payment);
            boolean predictedFraud = decision.score() >= 20;
            if (predictedFraud && Boolean.TRUE.equals(payment.getGroundTruthFraud())) truePositives++;
            else if (predictedFraud) falsePositives++;
            else if (Boolean.TRUE.equals(payment.getGroundTruthFraud())) falseNegatives++;
            else trueNegatives++;
        }

        int total = cases.size();
        BigDecimal precision = ratio(truePositives, truePositives + falsePositives);
        BigDecimal recall = ratio(truePositives, truePositives + falseNegatives);
        BigDecimal f1 = ratio(2 * truePositives, 2 * truePositives + falsePositives + falseNegatives);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dataset", "sentinel-live-labeled-payments");
        result.put("samples", total);
        result.put("positiveSamples", cases.stream().filter(payment -> Boolean.TRUE.equals(payment.getGroundTruthFraud())).count());
        result.put("threshold", 20);
        result.put("truePositives", truePositives);
        result.put("falsePositives", falsePositives);
        result.put("trueNegatives", trueNegatives);
        result.put("falseNegatives", falseNegatives);
        result.put("precision", precision);
        result.put("recall", recall);
        result.put("f1Score", f1);
        result.put("falsePositiveCostPerCase", falsePositiveCost);
        result.put("estimatedFalsePositiveCost", falsePositiveCost.multiply(BigDecimal.valueOf(falsePositives)));
        result.put("status", cases.isEmpty() ? "NO_LABELED_PAYMENTS" : "READY");
        return result;
    }

    private BigDecimal ratio(int numerator, int denominator) {
        if (denominator == 0) return BigDecimal.ZERO.setScale(4);
        return BigDecimal.valueOf(numerator)
                .divide(BigDecimal.valueOf(denominator), 4, RoundingMode.HALF_UP);
    }
}
