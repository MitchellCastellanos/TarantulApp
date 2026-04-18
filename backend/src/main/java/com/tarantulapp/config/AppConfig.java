package com.tarantulapp.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class AppConfig {

    private static final String APP_USER_AGENT = "TarantulApp/1.0 (tarantula collection tracker)";

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        ClientHttpRequestInterceptor userAgent = (request, body, execution) -> {
            if (!request.getHeaders().containsKey(HttpHeaders.USER_AGENT)) {
                request.getHeaders().set(HttpHeaders.USER_AGENT, APP_USER_AGENT);
            }
            return execution.execute(request, body);
        };
        return builder
                .setConnectTimeout(Duration.ofSeconds(10))
                .setReadTimeout(Duration.ofSeconds(30))
                .interceptors(userAgent)
                .build();
    }
}
