package Sentina.demo.repository;

import Sentina.demo.models.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {

    long countByCustomerIdAndCreatedAtAfter(String customerId, LocalDateTime timeWindow);

    long countByCustomerIdAndStatusAndCreatedAtAfter(String customerId, String status, LocalDateTime timeWindow);

    long countByIpAddressAndCreatedAtAfter(String ipAddress, LocalDateTime timeWindow);

    List<Payment> findByGroundTruthFraudNotNull();

    List<Payment> findAllByOrderByCreatedAtDesc();

    List<Payment> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Payment> findByUserId(Long userId);

    List<Payment> findByUserIdIsNull();
}