package ru.sportplatform.moderation.client;

import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import ru.sportplatform.common.dto.CommentSnapshotDto;
import ru.sportplatform.common.dto.CommentVisibilityRequest;
import ru.sportplatform.common.dto.EventSnapshotDto;
import ru.sportplatform.common.dto.EventStatusChangeRequest;
import ru.sportplatform.common.dto.OrganizationDecisionRequest;
import ru.sportplatform.common.dto.OrganizationDto;
import ru.sportplatform.common.dto.SportMergeRequest;
import ru.sportplatform.common.dto.UserDto;

/** Вызовы внутренних эндпоинтов identity-service и event-service от имени администратора. */
@Component
public class PlatformClients {

    private final RestClient identity;
    private final RestClient events;

    public PlatformClients(RestClient.Builder builder,
                           @Value("${services.identity-url}") String identityUrl,
                           @Value("${services.event-url}") String eventUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.identity = builder.clone().baseUrl(identityUrl).requestFactory(factory).build();
        this.events = builder.clone().baseUrl(eventUrl).requestFactory(factory).build();
    }

    public UserDto user(Long id) {
        return identity.get().uri("/api/users/{id}", id).retrieve().body(UserDto.class);
    }

    public OrganizationDto decideOrganization(Long id, OrganizationDecisionRequest request) {
        return identity.post().uri("/internal/organizations/{id}/decision", id).body(request).retrieve()
                .body(OrganizationDto.class);
    }

    public void mergeSports(SportMergeRequest request) {
        events.post().uri("/internal/sports/merge").body(request).retrieve().toBodilessEntity();
    }

    public EventSnapshotDto changeEventStatus(Long id, EventStatusChangeRequest request) {
        return events.post().uri("/internal/events/{id}/status", id).body(request).retrieve()
                .body(EventSnapshotDto.class);
    }

    public List<CommentSnapshotDto> openComments() {
        CommentSnapshotDto[] body = events.get().uri("/internal/comments/open").retrieve().body(CommentSnapshotDto[].class);
        return body == null ? List.of() : List.of(body);
    }

    public CommentSnapshotDto setCommentVisibility(Long id, CommentVisibilityRequest request) {
        return events.post().uri("/internal/comments/{id}/visibility", id).body(request).retrieve()
                .body(CommentSnapshotDto.class);
    }

    public CommentSnapshotDto deleteComment(Long id) {
        return events.delete().uri("/internal/comments/{id}", id).retrieve().body(CommentSnapshotDto.class);
    }
}
