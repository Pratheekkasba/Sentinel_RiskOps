package Sentina.demo.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "risk_evaluations")
public class RiskEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String paymentId;
    private int riskScore;
    private int confidence;
    private String riskLevel;

    @Column(columnDefinition = "TEXT")
    private String triggeredSignals;

    private LocalDateTime evaluatedAt = LocalDateTime.now();

    public RiskEvaluation() {
    }

    public RiskEvaluation(Long id, String paymentId, int riskScore, String riskLevel,
                          String triggeredSignals, LocalDateTime evaluatedAt) {
        this.id = id;
        this.paymentId = paymentId;
        this.riskScore = riskScore;
        this.riskLevel = riskLevel;
        this.triggeredSignals = triggeredSignals;
        this.evaluatedAt = evaluatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
    public int getRiskScore() { return riskScore; }
    public void setRiskScore(int riskScore) { this.riskScore = riskScore; }
    public int getConfidence() { return confidence; }
    public void setConfidence(int confidence) { this.confidence = confidence; }
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    public String getTriggeredSignals() { return triggeredSignals; }
    public void setTriggeredSignals(String triggeredSignals) { this.triggeredSignals = triggeredSignals; }
    public LocalDateTime getEvaluatedAt() { return evaluatedAt; }
    public void setEvaluatedAt(LocalDateTime evaluatedAt) { this.evaluatedAt = evaluatedAt; }
}