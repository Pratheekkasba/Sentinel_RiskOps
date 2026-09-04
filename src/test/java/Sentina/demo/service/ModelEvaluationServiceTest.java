package Sentina.demo.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ModelEvaluationServiceTest {

    @Test
    void reportsClassificationMetricsForHeldOutDataset() {
        Sentina.demo.repository.PaymentRepository payments = mock(Sentina.demo.repository.PaymentRepository.class);
        when(payments.findByGroundTruthFraudNotNull()).thenReturn(BenchmarkDataset.heldOutCases().stream().map(benchmarkCase -> {
            benchmarkCase.payment().setGroundTruthFraud(benchmarkCase.fraud());
            return benchmarkCase.payment();
        }).toList());
        when(payments.countByCustomerIdAndCreatedAtAfter(any(), any())).thenReturn(0L);
        when(payments.countByCustomerIdAndStatusAndCreatedAtAfter(any(), any(), any())).thenReturn(0L);
        when(payments.countByIpAddressAndCreatedAtAfter(any(), any())).thenReturn(0L);
        RiskEngineService riskEngine = new RiskEngineService(
            payments,
                mock(Sentina.demo.repository.RiskEvaluationRepository.class));
        ModelEvaluationService evaluation = new ModelEvaluationService(riskEngine, payments, new BigDecimal("2500"));

        Map<String, Object> result = evaluation.evaluate();

        assertEquals(12, result.get("samples"));
        assertEquals("READY", result.get("status"));
        assertNotNull(result.get("truePositives"));
        assertNotNull(result.get("falsePositives"));
        assertNotNull(result.get("trueNegatives"));
        assertNotNull(result.get("falseNegatives"));
        assertNotNull(result.get("precision"));
        assertNotNull(result.get("recall"));
        assertNotNull(result.get("f1Score"));
    }
}
