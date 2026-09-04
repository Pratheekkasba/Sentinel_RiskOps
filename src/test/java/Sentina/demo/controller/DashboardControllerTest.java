package Sentina.demo.controller;

import Sentina.demo.models.Payment;
import Sentina.demo.repository.AuditActionRepository;
import Sentina.demo.repository.InvestigationRepository;
import Sentina.demo.repository.PaymentRepository;
import Sentina.demo.repository.RiskEvaluationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DashboardControllerTest {

    @Test
    void resetDeletesAllRelatedData() {
        PaymentRepository payments = mock(PaymentRepository.class);
        RiskEvaluationRepository risks = mock(RiskEvaluationRepository.class);
        InvestigationRepository investigations = mock(InvestigationRepository.class);
        AuditActionRepository audits = mock(AuditActionRepository.class);
        DashboardController controller = new DashboardController(payments, risks, investigations, audits);

        ResponseEntity<?> response = controller.resetDashboard("");

        assertEquals(200, response.getStatusCode().value());
        verify(investigations).deleteAllInBatch();
        verify(risks).deleteAllInBatch();
        verify(audits).deleteAllInBatch();
        verify(payments).deleteAllInBatch();
    }

    @Test
    void decisionUpdatesPaymentAndCreatesAuditRecord() {
        PaymentRepository payments = mock(PaymentRepository.class);
        Payment payment = new Payment();
        payment.setPaymentId("pay_1");
        when(payments.findById("pay_1")).thenReturn(java.util.Optional.of(payment));
        when(payments.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        DashboardController controller = new DashboardController(payments, mock(RiskEvaluationRepository.class), mock(InvestigationRepository.class), mock(AuditActionRepository.class));

        ResponseEntity<?> response = controller.decidePayment("pay_1", Map.of("action", "block"), "analyst-7", "");

        assertEquals(200, response.getStatusCode().value());
        assertEquals("blocked", payment.getStatus());
        verify(payments).save(payment);
    }
}
