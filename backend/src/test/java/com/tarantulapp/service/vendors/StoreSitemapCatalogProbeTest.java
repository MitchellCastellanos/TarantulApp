package com.tarantulapp.service.vendors;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StoreSitemapCatalogProbeTest {

  @Test
  void parsesLightspeedProductUrls() {
    String xml = """
        <?xml version="1.0"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://minibeastscanada.ca/products/Grammostola-rosea-p529121975</loc></url>
          <url><loc>https://minibeastscanada.ca/products/Tarantulas-c141853044</loc></url>
        </urlset>
        """;
    var snap = StoreSitemapCatalogProbe.parse(xml, "https://minibeastscanada.ca");
    assertTrue(snap.found());
    assertEquals(1, snap.productCountEstimate());
    assertTrue(snap.sampleProductNames().get(0).toLowerCase().contains("grammostola"));
  }

  @Test
  void parsesRoonamiStyleHtmlProductUrls() {
    String xml = """
        <url><loc>https://www.roonami.com/aphonopelma-hentzi-texas-brown-tarantula.html</loc></url>
        <url><loc>https://www.roonami.com/animals/arachnids/tarantulas/</loc></url>
        """;
    var snap = StoreSitemapCatalogProbe.parse(xml, "https://www.roonami.com");
    assertEquals(1, snap.productCountEstimate());
    assertTrue(snap.storeCategories().stream().anyMatch(c -> "animals/arachnids/tarantulas".equals(c.get("slug"))));
  }

  @Test
  void isProductUrlDetectsPatterns() {
    assertTrue(StoreSitemapCatalogProbe.isProductUrl(
        "https://minibeastscanada.ca/products/Foo-p123"));
    assertTrue(StoreSitemapCatalogProbe.isProductUrl(
        "https://www.roonami.com/brachypelma-hamorii-tarantula.html"));
    assertTrue(!StoreSitemapCatalogProbe.isProductUrl(
        "https://www.roonami.com/animals/arachnids/tarantulas/"));
  }
}
