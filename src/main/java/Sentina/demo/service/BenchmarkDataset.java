package Sentina.demo.service;

import Sentina.demo.models.Payment;

import java.math.BigDecimal;
import java.util.List;

import static Sentina.demo.service.BenchmarkDataset.BenchmarkCase;

public final class BenchmarkDataset {

    private BenchmarkDataset() { }

    public static List<BenchmarkCase> heldOutCases() {
        return List.of(
                caseOf("clean-01", false, "captured", "Visa", "credit", false, "clean-01@example.com", "10.0.0.1", "100000", 0, 0, 0),
                caseOf("clean-02", false, "captured", "Mastercard", "credit", false, "clean-02@example.com", "10.0.0.2", "250000", 1, 0, 1),
                caseOf("clean-03", false, "approved", "Visa", "credit", false, "clean-03@example.com", "10.0.0.3", "900000", 0, 0, 0),
                caseOf("clean-04", false, "captured", "Visa", "credit", false, "clean-04@example.com", "10.0.0.4", "10000000", 0, 0, 0),
                caseOf("fraud-01", true, "failed", "Unknown", "prepaid", true, "fraud-01@example.com", "10.0.1.1", "50000000", 4, 3, 4),
                caseOf("fraud-02", true, "captured", "Unknown", "prepaid", true, "fraud-02@example.com", "10.0.1.2", "12000000", 2, 1, 2),
                caseOf("fraud-03", true, "failed", "Visa", "credit", false, "fraud-03@example.com", "10.0.1.3", "100000", 4, 3, 0),
                caseOf("fraud-04", true, "captured", "Visa", "credit", false, "fraud-04@example.com", "10.0.1.4", "100000", 0, 0, 4),
                caseOf("fraud-05", true, "captured", "Visa", "prepaid", true, "fraud-05@example.com", "10.0.1.5", "100000", 2, 0, 2),
                caseOf("fraud-06", true, "failed", "Visa", "credit", false, "fraud-06@example.com", "10.0.1.6", "100000", 2, 1, 0),
                caseOf("fraud-07", true, "captured", "Visa", "credit", false, "fraud-07@example.com", "10.0.1.7", "100000", 4, 0, 0),
                caseOf("fraud-08", true, "captured", "Visa", "credit", true, "fraud-08@example.com", "10.0.1.8", "100000", 0, 0, 0)
        );
    }

    private static BenchmarkCase caseOf(String id, boolean fraud, String status, String network,
                                        String cardType, boolean international, String customer,
                                        String ip, String amount, long velocity, long failed, long sharedIp) {
        Payment payment = new Payment();
        payment.setPaymentId(id);
        payment.setStatus(status);
        payment.setCardNetwork(network);
        payment.setCardType(cardType);
        payment.setInternational(international);
        payment.setCustomerId(customer);
        payment.setIpAddress(ip);
        payment.setAmount(new BigDecimal(amount));
        return new BenchmarkCase(payment, fraud, velocity, failed, sharedIp);
    }

    public record BenchmarkCase(Payment payment, boolean fraud, long velocityCount,
                                long failedCount, long sharedIpCount) { }
}
