package Sentina.demo.service;

import Sentina.demo.models.Payment;
import Sentina.demo.models.RiskEvaluation;
import Sentina.demo.repository.PaymentRepository;
import Sentina.demo.repository.RiskEvaluationRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RiskEngineServiceTest {

    @Test
    void scoresNormalCapturedPaymentAsLowRisk() {
        PaymentRepository payments = mock(PaymentRepository.class);
        RiskEvaluationRepository evaluations = mock(RiskEvaluationRepository.class);
        when(evaluations.save(any(RiskEvaluation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(payments.countByCustomerIdAndCreatedAtAfter(any(), any())).thenReturn(0L);
        when(payments.countByCustomerIdAndStatusAndCreatedAtAfter(any(), any(), any())).thenReturn(0L);
        when(payments.countByIpAddressAndCreatedAtAfter(any(), any())).thenReturn(0L);

        Payment payment = payment("captured", "Visa", "credit", false, new BigDecimal("100000"));
        RiskEvaluation result = new RiskEngineService(payments, evaluations).evaluate(payment);

        assertEquals(0, result.getRiskScore());
        assertEquals("LOW", result.getRiskLevel());
    }

    @Test
    void combinesBehavioralSignalsIntoCriticalRisk() {
        PaymentRepository payments = mock(PaymentRepository.class);
        RiskEvaluationRepository evaluations = mock(RiskEvaluationRepository.class);
        when(evaluations.save(any(RiskEvaluation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(payments.countByCustomerIdAndCreatedAtAfter(any(), any())).thenReturn(4L);
        when(payments.countByCustomerIdAndStatusAndCreatedAtAfter(any(), any(), any())).thenReturn(3L);
        when(payments.countByIpAddressAndCreatedAtAfter(any(), any())).thenReturn(4L);

        Payment payment = payment("failed", "Unknown", "prepaid", true, new BigDecimal("50000000"));
        RiskEvaluation result = new RiskEngineService(payments, evaluations).evaluate(payment);

        assertEquals(100, result.getRiskScore());
        assertEquals("CRITICAL", result.getRiskLevel());
        assertEquals(true, result.getTriggeredSignals().contains("HIGH_VELOCITY_10M"));
        assertEquals(true, result.getTriggeredSignals().contains("INTERNATIONAL_TRANSACTION"));
    }

    private Payment payment(String status, String network, String cardType, boolean international, BigDecimal amount) {
        Payment payment = new Payment();
        payment.setPaymentId("pay_test");
        payment.setCustomerId("customer@example.com");
        payment.setIpAddress("127.0.0.1");
        payment.setStatus(status);
        payment.setCardNetwork(network);
        payment.setCardType(cardType);
        payment.setInternational(international);
        payment.setAmount(amount);
        return payment;
    }
}
