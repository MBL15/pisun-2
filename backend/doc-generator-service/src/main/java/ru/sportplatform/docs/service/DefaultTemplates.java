package ru.sportplatform.docs.service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;

import ru.sportplatform.docs.domain.DocumentTemplate;

/** Шаблоны, которые предзагружаются при старте и восстанавливаются кнопкой «Сбросить». */
public final class DefaultTemplates {

    public record Definition(String code, String name, String description, String resource) {
    }

    public static final Map<String, Definition> ALL = Map.of(
            DocumentTemplate.ADULT_APPLICATION, new Definition(DocumentTemplate.ADULT_APPLICATION,
                    "Заявление на участие (взрослый)",
                    "Формируется, когда взрослый записывается на мероприятие сам",
                    "templates-default/adult-application.html"),
            DocumentTemplate.CHILD_CONSENT, new Definition(DocumentTemplate.CHILD_CONSENT,
                    "Согласие родителя на участие ребёнка",
                    "Формируется, когда родитель записывает ребёнка или ребёнок записывается со своего аккаунта",
                    "templates-default/child-consent.html")
    );

    private DefaultTemplates() {
    }

    public static String load(Definition definition) {
        try {
            return new ClassPathResource(definition.resource()).getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось прочитать шаблон " + definition.resource(), e);
        }
    }
}
