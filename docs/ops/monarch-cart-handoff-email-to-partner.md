# Monarch Reptiles — cart handoff email (forward to developer)

Copy the sections below into your mail client. Replace bracketed placeholders.

---

## Email (copy from here)

**Subject:** TarantulApp × Monarch — enable WooCommerce “add to cart” URLs for partner checkout

---

Hi [Monarch contact name],

We’re the team behind **TarantulApp** (a tarantula keeper marketplace). Monarch is our **founding partner** in Canada: we surface your catalog in our app and send buyers to **monarchreptiles.com** to pay and ship.

Product sync via the WooCommerce Store API is working well. The one blocker is **shared cart handoff**: when we send shoppers using standard WooCommerce “add to cart” links (including multiple items in one URL), the site returns **403 Forbidden** (nginx/WAF). We currently use a manual step-by-step flow; we’d like to restore a **one-click** experience for customers.

Could you forward the **technical section below** to your **WooCommerce developer or agency**? Happy to jump on a 15-minute call if that helps.

Thanks,  
[Your name]  
[Your role] — TarantulApp  
[your@email.com] · [phone optional]  
https://tarantulapp.com

---

### Technical brief (for your developer — forward from here)

**Context**  
TarantulApp refers purchase traffic to Monarch with UTM parameters (`utm_source=tarantulapp`, `utm_medium=partner_cart`). We need legitimate WooCommerce “add to cart” query URLs to **not be blocked** by nginx, ModSecurity, Cloudflare, or similar rules.

**Current issue**  
These URLs return **403 Forbidden** in the browser:

```
https://monarchreptiles.com/?add-to-cart=29661,30158,36936&quantity=1,1,1
https://monarchreptiles.com/cart/?add-to-cart=29661&add-to-cart=30158&quantity=1&quantity=1
```

**Desired flow**  
User builds a mini-cart in TarantulApp → one action opens Monarch with **the same line items already in the WooCommerce cart** → customer completes checkout on your store.

**Option A — Recommended: multi-add plugin or snippet**  
Install or enable support for **multiple products in a single URL**, e.g.:

- Plugin: [Add Multiple Products to Cart via URL for WooCommerce](https://wordpress.org/plugins/add-multiple-products-to-cart-via-url-for-woocommerce/)
- Typical plugin format:

```
https://monarchreptiles.com/cart/?add-to-cart=29661:1,30158:1,36936:1&utm_source=tarantulapp&utm_medium=partner_cart
```

(Use whatever URL format your chosen plugin documents.)

**Option B: theme snippet (no plugin)**  
On `template_redirect`, if `add-to-cart` contains commas, parse IDs (and matching `quantity` values), call `WC()->cart->add_to_cart()` for each, then redirect to the cart. Reference: [WooCommerce add-to-cart URLs](https://woocommerce.com/document/quick-guide-to-woocommerce-add-to-cart-urls/).

Example URL to support:

```
https://monarchreptiles.com/?add-to-cart=29661,30158,36936&quantity=1,1,1&utm_source=tarantulapp&utm_medium=partner_cart
```

(Quantity values should align by index with product IDs.)

**Option C — Minimum viable**  
If multi-add isn’t feasible immediately, please **stop blocking** single-item add-to-cart on **product pages**:

```
https://monarchreptiles.com/product/{slug}/?add-to-cart={PRODUCT_ID}&quantity={N}&utm_source=tarantulapp&utm_medium=partner_cart
```

We can keep a stepped flow on our side; Options A or B are strongly preferred.

**Security / WAF**  
If the 403 comes from firewall rules, please **allowlist** normal WooCommerce query parameters on `/`, `/cart/`, and `/product/*`: `add-to-cart`, `quantity`, `utm_source`, `utm_medium`.  
We do **not** need admin access or API keys—only public GET URLs that many WooCommerce stores already use.

**Acceptance tests**  
After the change, these should **add to cart and redirect** (not 403):

1. Single product: `/?add-to-cart={ID}&quantity=1`
2. Three products: agreed multi-add URL (Option A or B) with three real product IDs from your catalog

Please preserve `utm_source` / `utm_medium` through redirects for attribution.

**Our technical contact**  
[tech@email.com] — we can share test product IDs and validate together once deployed.

Thanks,  
[Your name] — TarantulApp

---

## After Monarch deploys

Tell us which URL format they enabled (comma batch, `id:qty` on `/cart/`, or product-page only). We will align `PartnerCartHandoffService` in the backend to match.

See also: [`../operations/monarch-founding-partner-integration.md`](../operations/monarch-founding-partner-integration.md)
