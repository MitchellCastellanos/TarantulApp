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
  void analyzeUnknownHostReturnsFactualPreview() {
    Map<String, Object> report = service.analyze("https://this-domain-definitely-does-not-exist-xyz123.invalid");
    assertEquals("unknown", report.get("storeType"));
    @SuppressWarnings("unchecked")
    Map<String, Object> products = (Map<String, Object>) report.get("products");
    assertFalse(Boolean.TRUE.equals(products.get("found")));
    assertTrue(report.containsKey("summaryLine"));
    assertTrue(report.get("storeCategories") instanceof List<?>);
    assertTrue(report.get("checklistNotes") instanceof Map<?, ?>);
  }
}
