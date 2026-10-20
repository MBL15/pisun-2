package ru.sportplatform.identity.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.common.enums.VerificationRequestStatus;
import ru.sportplatform.identity.domain.VerificationRequest;

public interface VerificationRequestRepository extends JpaRepository<VerificationRequest, Long> {

    Optional<VerificationRequest> findFirstByUserIdOrderByCreatedAtDesc(Long userId);

    List<VerificationRequest> findByStatusOrderByCreatedAtDesc(VerificationRequestStatus status);

    boolean existsByUserIdAndStatus(Long userId, VerificationRequestStatus status);
}
