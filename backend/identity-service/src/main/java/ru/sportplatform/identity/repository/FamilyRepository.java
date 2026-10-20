package ru.sportplatform.identity.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.identity.domain.Family;

public interface FamilyRepository extends JpaRepository<Family, Long> {

    List<Family> findAllByPendingSpouseUserId(Long pendingSpouseUserId);

    List<Family> findAllByPendingSpouseUserIdIsNotNull();
}
