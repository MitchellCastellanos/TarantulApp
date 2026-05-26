package com.tarantulapp.service.vendors;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.service.vendors.capabilities.PartnerFeedReadinessEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartnerReadinessReportServiceTest {

  @Mock
  private PartnerFeedReadinessEvaluator feedReadinessEvaluator;

  private PartnerReadinessReportService service;

  @BeforeEach
  void setUp() {
    service = new PartnerReadinessReportService(new ObjectMapper(), feedReadinessEvaluator);
    Map<String, Object> readiness = new LinkedHashMap<>();
    readiness.put("autosyncSupportedToday", false);
    readiness.put("recommendedFeedType", "unknown");
    readiness.put("activeFeedType", "unknown");
    readiness.put("missingRequirements", List.of());
    readiness.put("syncSupport", Map.of(
        "headline", "test",
        "detail", "test",
        "autosyncToday", false));
    readiness.put("csvFeedProbe", Map.of("ok", false));
    lenient().when(feedReadinessEvaluator.evaluate(any(), anyBoolean(), isNull(), isNull())).thenReturn(readiness);
  }

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
