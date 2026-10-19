package ru.sportplatform.docs.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.docs.domain.DocumentTemplate;

public interface DocumentTemplateRepository extends JpaRepository<DocumentTemplate, Long> {

    Optional<DocumentTemplate> findByCode(String code);

    List<DocumentTemplate> findAllByOrderByIdAsc();
}
