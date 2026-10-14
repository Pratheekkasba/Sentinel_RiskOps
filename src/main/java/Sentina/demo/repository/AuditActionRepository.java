package Sentina.demo.repository;

import Sentina.demo.models.AuditAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

@Repository
public interface AuditActionRepository extends JpaRepository<AuditAction, Long> {
    List<AuditAction> findByPaymentIdOrderByCreatedAtDesc(String paymentId);

    @Modifying
    @Transactional
    @Query("DELETE FROM AuditAction a WHERE a.paymentId IN :paymentIds")
    void deleteByPaymentIdIn(@Param("paymentIds") Collection<String> paymentIds);
}