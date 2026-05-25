# Partner cart handoff email (generic template)

Use when a WooCommerce official/founding partner’s site blocks or mishandles TarantulApp add-to-cart URLs. Replace bracketed placeholders; Monarch-specific example: [`monarch-cart-handoff-email-to-partner.md`](monarch-cart-handoff-email-to-partner.md).

---

## Email (copy from here)

**Subject:** TarantulApp cart handoff on [partner-domain] (quick site tweak?)

---

Hey [Name],

Quick heads up on the TarantulApp side of our partnership. Catalog sync is in good shape. The piece we still need your help on is checkout handoff when someone continues from our app to your store.

**What we are building for you**

A keeper browses your inventory inside TarantulApp. They add items to a partner-only mini cart in our app. When they tap continue, we send them to **[store-url]** with those line items supposed to land in the WooCommerce cart. They pay on your site like any other customer. We tag traffic with `utm_source=tarantulapp` and `utm_medium=partner_cart`.

**What may be happening**

We build standard WooCommerce add-to-cart links (including multiple product IDs). If those requests return **403** or the cart does not pre-fill, the flow feels broken until your site accepts normal query params.

Example shape (adjust to your working format):

```
https://[partner-domain]/?add-to-cart=[id1],[id2]&quantity=1,1
```

**What we need from your dev**

Allow add-to-cart query URLs (or tell us which URL pattern you prefer), for example:

1. Plugin such as [Add Multiple Products to Cart via URL for WooCommerce](https://wordpress.org/plugins/add-multiple-products-to-cart-via-url-for-woocommerce/)
2. Short `template_redirect` snippet calling `WC()->cart->add_to_cart()` per line
3. Temporary: single-product add URLs while multi-add is scoped

If 403 comes from nginx, ModSecurity, or Cloudflare, allowlist `add-to-cart`, `quantity`, and our UTM params on `/`, `/cart/`, and `/product/*`.

**Reply with**

- The URL format we should standardize on
- Rough ETA when it will be live

We will point the app at that shape only (`feed_config.cartHandoffMode` on our side).

[Mitch / your name]  
TarantulApp  
[your@email.com]

---

## After they reply

Note the URL format. Update partner `feed_config` / `PartnerCartHandoffService` if needed. Re-test from app partner cart.

See: [`../operations/partner-vendor-ecosystem-refactor-plan.md`](../operations/partner-vendor-ecosystem-refactor-plan.md)
