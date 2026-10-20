package ru.sportplatform.docs.client;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import ru.sportplatform.common.dto.EventSnapshotDto;
import ru.sportplatform.common.dto.UserDto;

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
}
