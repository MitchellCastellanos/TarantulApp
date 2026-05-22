# Monarch Reptiles — cart handoff email (personal / forward to developer)

Copy below into your mail client. Tweak names and tone to match how you usually write them.

---

## Email (copy from here)

**Subject:** Quick favor — making the TarantulApp → Monarch cart handoff smooth

---

Hey [Name],

Hope you’re doing well. Wanted to loop you in on something small on our side that would make the **TarantulApp × Monarch** experience feel the way we originally pictured it.

**How it works for your customers today (the good part)**  
Someone browses your catalog inside TarantulApp — tarantulas, cribs, feeders, substrate, the works. They tap **Add to cart** on a few items in our app (it’s a mini-cart, just for Monarch). When they’re ready, they hit **Continue on Monarch** and we send them to **your** site to pay and ship. You keep the sale, checkout, and fulfillment; we’re basically a storefront window that points people your way (with UTM tags so you can see it came from us).

**Where we’re stuck (the annoying part)**  
Right now, when we try to send them over with the usual WooCommerce links that *pre-load* those same items into the cart on monarchreptiles.com, the site hits them with a **403 Forbidden** page. So instead of “land on Monarch with your spiders already in the cart,” they get a clunky workaround — open each product one by one. It works, but it’s not the slick handoff we want for you or for them.

**What we need from your developer (plain English)**  
We need your web person to make it so **normal “add this product to cart” links aren’t blocked** — the same kind of URLs WooCommerce uses everywhere. Ideally:

- Customer picks 2–3 items in TarantulApp  
- One click opens your site  
- Those items are **already in the WooCommerce cart**  
- They checkout like any other Monarch customer  

That usually means either a small WooCommerce plugin for “add multiple products via URL,” or a tiny custom snippet — nothing invasive, no admin access from us, no API keys.

I dropped a **short technical note** below that you can forward as-is to whoever maintains the site. If it’s easier, happy to jump on a quick call with you + them — 15 minutes usually sorts it out.

Really appreciate you guys being the founding partner on this. Once that cart link works, the flow is going to feel great for both sides.

Talk soon,  
[Mitch / your name]  
TarantulApp  
[your@email.com] · [phone]

---

### For your developer (forward this block)

**What TarantulApp is trying to do**  
Referral traffic from our app adds tagged line items to the WooCommerce cart, then the customer checks out on monarchreptiles.com. We pass `utm_source=tarantulapp` and `utm_medium=partner_cart` for attribution.

**What’s broken today**  
GET requests with `add-to-cart` (and especially multiple IDs) return **403** — likely nginx / ModSecurity / Cloudflare. Examples that fail:

```
https://monarchreptiles.com/?add-to-cart=29661,30158,36936&quantity=1,1,1
https://monarchreptiles.com/cart/?add-to-cart=29661&add-to-cart=30158&quantity=1&quantity=1
```

**What “done” looks like**  
A link from TarantulApp opens Monarch and the WooCommerce cart already contains the selected products (correct quantities), then the customer proceeds to checkout. No 403.

**Easiest fixes (pick one)**  

1. **Plugin** — e.g. [Add Multiple Products to Cart via URL for WooCommerce](https://wordpress.org/plugins/add-multiple-products-to-cart-via-url-for-woocommerce/)  
   Example format (confirm with plugin docs):

   `https://monarchreptiles.com/cart/?add-to-cart=29661:1,30158:1,36936:1&utm_source=tarantulapp&utm_medium=partner_cart`

2. **Small custom handler** — on `template_redirect`, parse comma-separated `add-to-cart` + `quantity`, loop `WC()->cart->add_to_cart()`, redirect to cart.  
   [WooCommerce add-to-cart URL docs](https://woocommerce.com/document/quick-guide-to-woocommerce-add-to-cart-urls/)

3. **Minimum** — if multi-add is a bigger project, at least allow single-item add on product URLs (no 403):

   `https://monarchreptiles.com/product/{slug}/?add-to-cart={ID}&quantity={N}`

**WAF note**  
If security rules are the cause, allowlist query params `add-to-cart`, `quantity`, `utm_source`, `utm_medium` on `/`, `/cart/`, and `/product/*`.

**Quick test after deploy**  
- One product: `/?add-to-cart={real_id}&quantity=1` → lands in cart, not 403  
- Three products: whatever multi-add format you enable → all three in cart  

Ping us at [tech@email.com] with the final URL shape and we’ll wire our app to match.

Thanks,  
[Mitch / your name] — TarantulApp

---

## After they fix it

Ask which URL format they shipped (comma list, `id:qty` on `/cart/`, etc.). We update `PartnerCartHandoffService` to match.

See: [`../operations/monarch-founding-partner-integration.md`](../operations/monarch-founding-partner-integration.md)
