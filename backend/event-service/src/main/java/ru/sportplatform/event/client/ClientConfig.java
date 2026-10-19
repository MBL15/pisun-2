package ru.sportplatform.event.client;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class ClientConfig {

    @Bean
    RestClient identityRestClient(RestClient.Builder builder, @Value("${services.identity-url}") String url) {
        return builder.clone().baseUrl(url).requestFactory(factory(Duration.ofSeconds(5))).build();
    }

    @Bean
    RestClient aiRestClient(RestClient.Builder builder, @Value("${services.ai-url}") String url) {
        // ИИ может обращаться к внешней LLM, поэтому даём ему больше времени
        return builder.clone().baseUrl(url).requestFactory(factory(Duration.ofSeconds(20))).build();
    }

    private static SimpleClientHttpRequestFactory factory(Duration readTimeout) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(readTimeout);
        return factory;
    }
}
