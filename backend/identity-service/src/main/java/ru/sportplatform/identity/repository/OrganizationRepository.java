package ru.sportplatform.identity.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.identity.domain.Organization;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    List<Organization> findAllByOrderByCreatedAtDesc();

    List<Organization> findByStatusOrderByCreatedAtDesc(ApplicationStatus status);

    Optional<Organization> findFirstByOwnerUserId(Long ownerUserId);
}
