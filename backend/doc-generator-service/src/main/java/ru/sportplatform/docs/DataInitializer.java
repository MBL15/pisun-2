package ru.sportplatform.docs;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.docs.domain.DocumentTemplate;
import ru.sportplatform.docs.repository.DocumentTemplateRepository;
import ru.sportplatform.docs.service.DefaultTemplates;

/** Предзагружает базовые шаблоны: заявление взрослого и согласие родителя. */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final DocumentTemplateRepository templates;

    @Override
    @Transactional
    public void run(String... args) {
        DefaultTemplates.ALL.values().stream()
                .filter(definition -> templates.findByCode(definition.code()).isEmpty())
                .forEach(definition -> {
                    templates.save(DocumentTemplate.builder()
                            .code(definition.code())
                            .name(definition.name())
                            .description(definition.description())
                            .content(DefaultTemplates.load(definition))
                            .updatedBy("Система")
                            .build());
                    log.info("Docs: загружен шаблон {}", definition.code());
                });
    }
}
