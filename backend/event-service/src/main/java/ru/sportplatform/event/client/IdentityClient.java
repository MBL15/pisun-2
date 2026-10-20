package ru.sportplatform.event.client;

import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import ru.sportplatform.common.dto.ReputationDeltaRequest;
import ru.sportplatform.common.dto.UserDto;

@Component
public class IdentityClient {

    private final RestClient client;

    public IdentityClient(@Qualifier("identityRestClient") RestClient client) {
        this.client = client;
    }

    public UserDto getUser(Long id) {
        return client.get().uri("/internal/users/{id}", id).retrieve().body(UserDto.class);
    }

    public List<UserDto> getChildren(Long parentId) {
        return client.get().uri("/api/users/{id}/children", parentId).retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
    }

    public List<Long> getFriendIds(Long userId) {
        List<Long> ids = client.get().uri("/internal/friendship/users/{id}/friend-ids", userId).retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
        return ids == null ? List.of() : ids;
    }

    public UserDto applyReputationDelta(Long userId, int delta, String reason) {
        return client.post()
                .uri("/internal/users/{id}/reputation/delta", userId)
                .body(new ReputationDeltaRequest(delta, reason))
                .retrieve()
                .body(UserDto.class);
    }

    public UserDto banForProhibitedPhrase(Long userId) {
        return client.post()
                .uri("/internal/users/{id}/ban/prohibited-phrase", userId)
                .retrieve()
                .body(UserDto.class);
    }

    public boolean areFriends(Long userA, Long userB) {
        if (userA == null || userB == null || userA.equals(userB)) {
            return false;
        }
        Boolean result = client.get()
                .uri(uri -> uri.path("/internal/friendship/check").queryParam("a", userA).queryParam("b", userB).build())
                .retrieve()
                .body(Boolean.class);
        return Boolean.TRUE.equals(result);
    }
}
