package com.tarantulapp.service;

import com.tarantulapp.entity.DevicePushToken;
import com.tarantulapp.repository.DevicePushTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class PushNotificationService {

    private final DevicePushTokenRepository tokenRepository;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${app.push.enabled:true}")
    private boolean pushEnabled;

    @Value("${app.push.fcm-server-key:}")
    private String fcmServerKey;

    public PushNotificationService(DevicePushTokenRepository tokenRepository) {
        this.tokenRepository = tokenRepository;
    }

    public void registerDevice(UUID userId, String platform, String token) {
        String normalizedToken = token == null ? "" : token.trim();
        if (normalizedToken.isEmpty()) {
            throw new IllegalArgumentException("Token push inválido");
        }
        String normalizedPlatform = platform == null ? "" : platform.trim().toLowerCase();
        if (!normalizedPlatform.equals("android") && !normalizedPlatform.equals("ios")) {
            throw new IllegalArgumentException("Plataforma push inválida");
        }

        DevicePushToken row = tokenRepository.findByToken(normalizedToken).orElseGet(DevicePushToken::new);
        row.setUserId(userId);
        row.setPlatform(normalizedPlatform);
        row.setToken(normalizedToken);
        row.setEnabled(true);
        row.setLastSeenAt(Instant.now());
        tokenRepository.save(row);
    }

    public void unregisterDevice(UUID userId, String token) {
        String normalizedToken = token == null ? "" : token.trim();
        if (normalizedToken.isEmpty()) return;
        tokenRepository.deleteByUserIdAndToken(userId, normalizedToken);
    }

    public int sendReminderPushToUser(UUID userId, String title, String body) {
        if (!pushEnabled || fcmServerKey == null || fcmServerKey.isBlank()) {
            return 0;
        }
        List<DevicePushToken> devices = tokenRepository.findByUserIdAndEnabledTrue(userId);
        int delivered = 0;
        for (DevicePushToken device : devices) {
            if (!"android".equals(device.getPlatform())) {
                continue;
            }
            if (sendFcm(device.getToken(), title, body)) {
                delivered++;
            }
        }
        return delivered;
    }

    private boolean sendFcm(String deviceToken, String title, String body) {
        String payload = "{\"to\":\"" + escape(deviceToken) + "\",\"notification\":{\"title\":\""
                + escape(title) + "\",\"body\":\"" + escape(body) + "\"},\"priority\":\"high\"}";
        HttpRequest request = HttpRequest.newBuilder(URI.create("https://fcm.googleapis.com/fcm/send"))
                .header("Authorization", "key=" + fcmServerKey)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() >= 200 && response.statusCode() < 300;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (IOException e) {
            return false;
        }
    }

    private static String escape(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
