package Sentina.demo.repository;

import Sentina.demo.models.AuditAction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditActionRepository extends JpaRepository<AuditAction, Long> {
    List<AuditAction> findByPaymentIdOrderByCreatedAtDesc(String paymentId);
}