package Sentina.demo.repository;

import Sentina.demo.models.RiskEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RiskEvaluationRepository extends JpaRepository<RiskEvaluation, Long> {

    Optional<RiskEvaluation> findByPaymentId(String paymentId);
}