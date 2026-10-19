package ru.sportplatform.event.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.event.domain.SportType;

public interface SportTypeRepository extends JpaRepository<SportType, Long> {

    Optional<SportType> findByNameKey(String nameKey);

    List<SportType> findAllByOrderByCustomAscNameAsc();
}
