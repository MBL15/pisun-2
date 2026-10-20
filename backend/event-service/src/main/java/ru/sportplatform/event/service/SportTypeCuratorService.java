package ru.sportplatform.event.service;

import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.SportNormalizeRequest;
import ru.sportplatform.common.dto.SportNormalizeResult;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.event.client.AiClient;
import ru.sportplatform.event.repository.SportTypeRepository;
import ru.sportplatform.event.web.dto.SportSuggestItem;

@Service
@RequiredArgsConstructor
public class SportTypeCuratorService {

    private final SportTypeRepository sportTypes;
    private final AiClient ai;

    @Transactional(readOnly = true)
    public List<SportSuggestItem> suggest(String query) {
        if (TextUtils.isBlank(query) || query.trim().length() < 2) {
            return List.of();
        }
        String key = TextUtils.normalizeKey(query);
        String expandedKey = TextUtils.normalizeKey(TextUtils.canonicalSportQuery(query));
        return sportTypes.findAllByOrderByCustomAscNameAsc().stream()
                .map(s -> {
                    String candidate = TextUtils.normalizeKey(s.getName());
                    double best = Math.max(score(key, candidate), score(expandedKey, candidate));
                    return new SportSuggestItem(s.getId(), s.getName(), s.getEmoji(), best);
                })
                .filter(item -> item.score() >= 0.45)
                .sorted(Comparator.comparingDouble(SportSuggestItem::score).reversed())
                .limit(8)
                .toList();
    }

    @Transactional(readOnly = true)
    public SportNormalizeResult propose(String query) {
        List<String> known = sportTypes.findAllByOrderByCustomAscNameAsc().stream().map(s -> s.getName()).toList();
        return ai.normalizeSport(new SportNormalizeRequest(query.trim(), known));
    }

    private static double score(String query, String candidate) {
        if (candidate.equals(query)) {
            return 1.0;
        }
        if (candidate.startsWith(query) || query.startsWith(candidate)) {
            return 0.92;
        }
        if (candidate.contains(query) || query.contains(candidate)) {
            return 0.85;
        }
        int dist = levenshtein(query, candidate);
        int max = Math.max(query.length(), candidate.length());
        return max == 0 ? 0 : 1.0 - (double) dist / max;
    }

    private static int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= b.length(); j++) {
            dp[0][j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost);
            }
        }
        return dp[a.length()][b.length()];
    }
}
