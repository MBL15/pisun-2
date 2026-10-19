package ru.sportplatform.moderation.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.common.dto.CommentSnapshotDto;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.moderation.ai.HeuristicAnalyzer;
import ru.sportplatform.moderation.client.PlatformClients;
import ru.sportplatform.moderation.domain.AiAuditLog;
import ru.sportplatform.moderation.repository.AiAuditLogRepository;
import ru.sportplatform.moderation.web.dto.GuardianReportDto;

@Slf4j
@Service
@RequiredArgsConstructor
public class GuardianReportService {

    private final AiAuditLogRepository logs;
    private final HeuristicAnalyzer heuristics;
    private final SettingsService settings;
    private final PlatformClients platform;

    @Transactional(readOnly = true)
    public GuardianReportDto daily(CurrentUser current) {
        current.requireAdmin();
        Instant since = Instant.now().minus(1, ChronoUnit.DAYS);
        List<AiAuditLog> rows = logs.findByAgentAndCreatedAtAfterOrderByCreatedAtDesc("GUARDIAN", since);
        long flagged = rows.stream().filter(row -> "FLAGGED".equals(row.getVerdict())).count();
        long unpublished = rows.stream().filter(row -> "UNPUBLISH".equals(row.getAction())).count();
        Map<String, Integer> reasons = new LinkedHashMap<>();
        for (AiAuditLog row : rows) {
            if (!"FLAGGED".equals(row.getVerdict()) || row.getDetail() == null) {
                continue;
            }
            String key = row.getDetail().length() > 80 ? row.getDetail().substring(0, 80) : row.getDetail();
            reasons.merge(key, 1, Integer::sum);
        }
        List<String> top = reasons.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(3)
                .map(Map.Entry::getKey)
                .toList();

        int toxic = 0;
        try {
            String stop = settings.current().getCustomStopWords();
            for (CommentSnapshotDto comment : platform.openComments()) {
                if (!heuristics.analyzeComment(comment.text(), stop).isEmpty()) {
                    toxic++;
                }
            }
        } catch (Exception e) {
            log.warn("Cannot scan comments for guardian report: {}", e.getMessage());
        }
        String suggestion = toxic == 0
                ? "Открытых токсичных комментариев нет."
                : "Агент предлагает скрыть все отмеченные сообщения разом (" + toxic + "), а не по одному.";
        return new GuardianReportDto(rows.size(), flagged, unpublished, top.isEmpty() ? List.of("За сутки флагов не было") : top,
                toxic, suggestion);
    }

    public List<CommentSnapshotDto> toxicComments() {
        List<CommentSnapshotDto> found = new ArrayList<>();
        String stop = settings.current().getCustomStopWords();
        for (CommentSnapshotDto comment : platform.openComments()) {
            if (!heuristics.analyzeComment(comment.text(), stop).isEmpty()) {
                found.add(comment);
            }
        }
        return found;
    }
}
