package com.tarantulapp.service.vendors;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PartnerReadinessReportServiceTest {

  private final PartnerReadinessReportService service =
      new PartnerReadinessReportService(new ObjectMapper());

  @Test
  void analyzeRequiresWebsiteUrl() {
    assertThrows(IllegalArgumentException.class, () -> service.analyze("  "));
  }

  @Test
  void analyzeUnknownHostReturnsNoCatalogVerdict() {
    Map<String, Object> report = service.analyze("https://this-domain-definitely-does-not-exist-xyz123.invalid");
    assertEquals("unknown", report.get("detectedPlatform"));
    @SuppressWarnings("unchecked")
    Map<String, Object> catalog = (Map<String, Object>) report.get("catalog");
    assertFalse(Boolean.TRUE.equals(catalog.get("hasCatalog")));
    assertTrue(List.of("no_catalog", "unknown_platform").contains(report.get("verdict")));
    assertTrue(report.containsKey("verdictSummary"));
    assertTrue(report.get("pitchHints") instanceof List<?>);
  }
}
