package Sentina.demo.repository;

import Sentina.demo.models.Investigation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface InvestigationRepository extends JpaRepository<Investigation, Long> {
    Optional<Investigation> findByPaymentId(String paymentId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Investigation i WHERE i.paymentId IN :paymentIds")
    void deleteByPaymentIdIn(@Param("paymentIds") Collection<String> paymentIds);
}