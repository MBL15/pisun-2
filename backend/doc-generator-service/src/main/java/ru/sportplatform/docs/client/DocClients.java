package ru.sportplatform.docs.client;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import org.springframework.web.client.RestClientResponseException;

import ru.sportplatform.common.dto.EventSnapshotDto;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.web.CurrentUser;

@Component
public class DocClients {

    private final RestClient identity;
    private final RestClient events;

    public DocClients(RestClient.Builder builder,
                      @Value("${services.identity-url}") String identityUrl,
                      @Value("${services.event-url}") String eventUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.identity = builder.clone().baseUrl(identityUrl).requestFactory(factory).build();
        this.events = builder.clone().baseUrl(eventUrl).requestFactory(factory).build();
    }

    public UserDto user(Long id) {
        return identity.get().uri("/internal/users/{id}", id).retrieve().body(UserDto.class);
    }

    public EventSnapshotDto event(Long id) {
        return events.get().uri("/internal/events/{id}", id).retrieve().body(EventSnapshotDto.class);
    }

    /**
     * Проверяет, что зритель реально видит событие: запрос идёт в публичный endpoint
     * event-service с его же демо-заголовками, поэтому срабатывают все правила видимости
     * (FRIENDS_ONLY, снятие с публикации, отзыв допуска организации).
     */
    public void checkEventVisible(CurrentUser viewer, Long eventId) {
        try {
            events.get().uri("/api/events/{id}", eventId)
                    .header("X-User-Id", String.valueOf(viewer.id()))
                    .header("X-User-Role", viewer.role().name())
                    .retrieve().toBodilessEntity();
        } catch (RestClientResponseException e) {
            throw ApiException.forbidden("Мероприятие недоступно — нельзя сформировать документ");
        }
    }
}
