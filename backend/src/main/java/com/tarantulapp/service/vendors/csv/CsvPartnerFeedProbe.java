package com.tarantulapp.service.vendors.csv;

import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class CsvPartnerFeedProbe {

    private static final Duration TIMEOUT = Duration.ofSeconds(20);

    private final CsvPartnerFeedParser parser;
    private final HttpClient httpClient;

    public CsvPartnerFeedProbe(CsvPartnerFeedParser parser) {
        this.parser = parser;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public ProbeResult probe(String feedUrl) {
        if (feedUrl == null || feedUrl.isBlank()) {
            return ProbeResult.fail("feedUrl vacío");
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(feedUrl.trim()))
                    .timeout(TIMEOUT)
                    .header("Accept", "text/csv,text/plain,*/*")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return ProbeResult.fail("HTTP " + response.statusCode());
            }
            String body = response.body() == null ? "" : response.body();
            if (body.isBlank()) {
                return ProbeResult.fail("CSV vacío");
            }
            CsvPartnerFeedParser.ParseResult parsed = parser.parse(body, Map.of());
            if (parsed.rows().isEmpty()) {
                return ProbeResult.fail("Sin filas de producto — revisa cabeceras (title/name, url)");
            }
            List<String> sampleTitles = parsed.rows().stream()
                    .limit(5)
                    .map(r -> r.title())
                    .toList();
            return ProbeResult.ok(parsed.rows().size(), sampleTitles, parsed.detectedColumns());
        } catch (Exception ex) {
            return ProbeResult.fail(ex.getMessage() == null ? "Error leyendo CSV" : ex.getMessage());
        }
    }

    public record ProbeResult(
            boolean ok,
            int rowCount,
            List<String> sampleTitles,
            Map<String, String> detectedColumns,
            String detail
    ) {
        public static ProbeResult ok(int rows, List<String> samples, Map<String, String> columns) {
            return new ProbeResult(true, rows, samples, columns, "OK");
        }

        public static ProbeResult fail(String detail) {
            return new ProbeResult(false, 0, List.of(), Map.of(), detail);
        }

        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ok", ok);
            m.put("rowCount", rowCount);
            m.put("sampleTitles", sampleTitles == null ? List.of() : sampleTitles);
            m.put("detectedColumns", detectedColumns == null ? Map.of() : detectedColumns);
            m.put("detail", detail);
            return m;
        }
    }
}
