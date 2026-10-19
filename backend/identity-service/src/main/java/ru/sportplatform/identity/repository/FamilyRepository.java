package ru.sportplatform.identity.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.identity.domain.Family;

public interface FamilyRepository extends JpaRepository<Family, Long> {
}
