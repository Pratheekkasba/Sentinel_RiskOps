package Sentina.demo.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_actions")
public class AuditAction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String paymentId;
    private String action;
    private String analystId;
    private LocalDateTime createdAt = LocalDateTime.now();

    public AuditAction() {}

    public AuditAction(String paymentId, String action, String analystId) {
        this.paymentId = paymentId;
        this.action = action;
        this.analystId = analystId;
    }

    public Long getId() { return id; }
    public String getPaymentId() { return paymentId; }
    public String getAction() { return action; }
    public String getAnalystId() { return analystId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}