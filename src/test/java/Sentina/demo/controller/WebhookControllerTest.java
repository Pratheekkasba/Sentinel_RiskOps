package Sentina.demo.controller;

import Sentina.demo.repository.PaymentRepository;
import Sentina.demo.repository.InvestigationRepository;
import Sentina.demo.repository.RiskEvaluationRepository;
import Sentina.demo.service.AiInvestigatorService;
import Sentina.demo.service.RiskEngineService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import jakarta.servlet.http.HttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class WebhookControllerTest {

    @Test
    void duplicatePaymentEventIsIgnored() {
        PaymentRepository payments = mock(PaymentRepository.class);
        when(payments.existsById("pay_duplicate")).thenReturn(true);
        RiskEngineService riskEngine = new RiskEngineService(payments, mock(RiskEvaluationRepository.class));
        AiInvestigatorService investigator = new AiInvestigatorService(mock(InvestigationRepository.class));
        WebhookController controller = new WebhookController(payments, riskEngine, investigator, new ObjectMapper(), false, "change-me");
        String payload = "{\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_duplicate\"}}}}";

        var response = controller.handleRazorpayWebhook(payload, mock(HttpServletRequest.class));

        assertEquals(200, response.getStatusCode().value());
        verify(payments, never()).save(any());
    }

    @Test
    void batchPaymentEventsAreProcessedTogether() {
        PaymentRepository payments = mock(PaymentRepository.class);
        when(payments.existsById(anyString())).thenReturn(false);
        when(payments.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(payments.countByCustomerIdAndCreatedAtAfter(any(), any())).thenReturn(0L);
        when(payments.countByCustomerIdAndStatusAndCreatedAtAfter(any(), any(), any())).thenReturn(0L);
        when(payments.countByIpAddressAndCreatedAtAfter(any(), any())).thenReturn(0L);
        InvestigationRepository investigations = mock(InvestigationRepository.class);
        when(investigations.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        RiskEvaluationRepository evaluations = mock(RiskEvaluationRepository.class);
        when(evaluations.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        WebhookController controller = new WebhookController(
                payments, new RiskEngineService(payments, evaluations),
                new AiInvestigatorService(investigations), new ObjectMapper(), false, "change-me");
        String payload = "[{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_1\",\"amount\":10000,\"status\":\"captured\"}}}},{\"event\":\"payment.failed\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_2\",\"amount\":20000,\"status\":\"failed\"}}}}]";

        var response = controller.handleRazorpayWebhook(payload, mock(HttpServletRequest.class));

        assertEquals(200, response.getStatusCode().value());
        verify(payments, times(4)).save(any());
    }
}
