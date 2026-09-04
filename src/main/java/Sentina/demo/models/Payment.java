package Sentina.demo.models;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    private String paymentId;
    private String orderId;
    private String status;
    private String paymentMethod;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private BigDecimal amount;
    private String customerId;
    
    // Core Risk Telemetry
    private String ipAddress;
    private Integer riskScore;
    private Integer riskConfidence;
    private String riskLevel;
    private String triggeredSignals;

    // ML and AI context
    private String cardNetwork;
    private String cardType;
    private String issuerBank;
    private Boolean international;
    private String contactNumber;
    @Column(length = 500)
    private String userAgent;
    private String errorReason;
    @Column(columnDefinition = "TEXT")
    private String evidenceSummary;
    private String suggestedAction;
    @Column(name = "is_fraud")
    private Boolean groundTruthFraud;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Getters and Setters
    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public Integer getRiskScore() { return riskScore; }
    public void setRiskScore(Integer riskScore) { this.riskScore = riskScore; }

    public Integer getRiskConfidence() { return riskConfidence; }
    public void setRiskConfidence(Integer riskConfidence) { this.riskConfidence = riskConfidence; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getTriggeredSignals() { return triggeredSignals; }
    public void setTriggeredSignals(String triggeredSignals) { this.triggeredSignals = triggeredSignals; }

    public String getCardNetwork() { return cardNetwork; }
    public void setCardNetwork(String cardNetwork) { this.cardNetwork = cardNetwork; }

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }

    public String getIssuerBank() { return issuerBank; }
    public void setIssuerBank(String issuerBank) { this.issuerBank = issuerBank; }

    public Boolean getInternational() { return international; }
    public void setInternational(Boolean international) { this.international = international; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public String getErrorReason() { return errorReason; }
    public void setErrorReason(String errorReason) { this.errorReason = errorReason; }

    public String getEvidenceSummary() { return evidenceSummary; }
    public void setEvidenceSummary(String evidenceSummary) { this.evidenceSummary = evidenceSummary; }

    public String getSuggestedAction() { return suggestedAction; }
    public void setSuggestedAction(String suggestedAction) { this.suggestedAction = suggestedAction; }

    public Boolean getGroundTruthFraud() { return groundTruthFraud; }
    public void setGroundTruthFraud(Boolean groundTruthFraud) { this.groundTruthFraud = groundTruthFraud; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}