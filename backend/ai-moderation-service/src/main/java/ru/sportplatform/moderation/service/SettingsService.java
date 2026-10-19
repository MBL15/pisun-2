package ru.sportplatform.moderation.service;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.moderation.ai.LlmClient;
import ru.sportplatform.moderation.domain.ModerationSettings;
import ru.sportplatform.moderation.repository.ModerationSettingsRepository;
import ru.sportplatform.moderation.web.dto.SettingsDto;
import ru.sportplatform.moderation.web.dto.SettingsForm;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final ModerationSettingsRepository repository;
    private final LlmClient llm;

    @Transactional
    public ModerationSettings current() {
        return repository.findFirstByOrderByIdAsc().orElseGet(() -> repository.save(defaults()));
    }

    @Transactional
    public SettingsDto get() {
        return toDto(current());
    }

    @Transactional
    public SettingsDto update(SettingsForm form, String adminName) {
        ModerationSettings settings = current();
        settings.setAiEnabled(form.aiEnabled());
        settings.setAutoHoldFlagged(form.autoHoldFlagged());
        settings.setLlmEnabled(form.llmEnabled());
        settings.setCommentFilterEnabled(form.commentFilterEnabled());
        settings.setCustomStopWords(form.customStopWords());
        settings.setUpdatedAt(Instant.now());
        settings.setUpdatedBy(adminName);
        return toDto(settings);
    }

    public static ModerationSettings defaults() {
        return ModerationSettings.builder()
                .aiEnabled(true)
                .autoHoldFlagged(true)
                .llmEnabled(true)
                .commentFilterEnabled(true)
                .customStopWords("")
                .updatedAt(Instant.now())
                .updatedBy("Система")
                .build();
    }

    private SettingsDto toDto(ModerationSettings s) {
        return new SettingsDto(s.isAiEnabled(), s.isAutoHoldFlagged(), s.isLlmEnabled(), s.isCommentFilterEnabled(),
                s.getCustomStopWords(), llm.isConfigured(), llm.model(), s.getUpdatedAt(), s.getUpdatedBy());
    }
}
