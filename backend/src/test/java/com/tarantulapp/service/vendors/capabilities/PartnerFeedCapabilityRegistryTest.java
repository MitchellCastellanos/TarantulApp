package com.tarantulapp.service.vendors.capabilities;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PartnerFeedCapabilityRegistryTest {

  private final PartnerFeedCapabilityRegistry registry = new PartnerFeedCapabilityRegistry();

  @Test
  void recommendsLightspeedForLightspeedStore() {
    // Lightspeed is a first-class feed type now that the Lightspeed eCom adapter exists.
    assertEquals("lightspeed", registry.recommendFeedType("lightspeed", false));
  }

  @Test
  void recommendsCsvForUnknownStore() {
    assertEquals("csv", registry.recommendFeedType("wix", false));
  }

  @Test
  void recommendsWooWhenStoreApiOk() {
    assertEquals("woocommerce", registry.recommendFeedType("lightspeed", true));
  }

  @Test
  void buildSyncSupportListsMissingCsvUrl() {
    var sync = registry.buildSyncSupport("csv", false, java.util.List.of("feedUrl"));
    assertFalse((Boolean) sync.get("autosyncToday"));
    assertTrue(String.valueOf(sync.get("detail")).contains("feedUrl"));
  }
}
