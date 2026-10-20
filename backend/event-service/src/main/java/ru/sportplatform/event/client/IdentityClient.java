package ru.sportplatform.event.client;

import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

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
}
