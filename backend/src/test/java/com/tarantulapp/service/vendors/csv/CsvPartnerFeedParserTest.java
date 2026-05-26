package com.tarantulapp.service.vendors.csv;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CsvPartnerFeedParserTest {

  private final CsvPartnerFeedParser parser = new CsvPartnerFeedParser();

  @Test
  void parsesHeaderRowAndMapsProducts() {
    String csv = """
        sku,title,price,stock,url,category
        T001,Brachypelma hamorii,120.00,3,https://shop.example/p1,Tarantulas
        T002,Feeder crickets,5.50,100,https://shop.example/p2,Feeders
        """;
    var result = parser.parse(csv, java.util.Map.of());
    assertEquals(2, result.rows().size());
    var listings = parser.toRawListings(
        result.rows(),
        java.util.Map.of(
            "allowedCategories",
            java.util.List.of("tarantulas", "live_food", "supplies")),
        "CA",
        "AB",
        "Edmonton",
        "CAD");
    assertTrue(listings.size() >= 1);
  }
}
