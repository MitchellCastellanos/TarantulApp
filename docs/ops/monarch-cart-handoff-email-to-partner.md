# Monarch Reptiles — cart handoff email (single forward)

Copy everything between the lines into one email. Monarch can forward the whole thing to whoever runs their WooCommerce site.

---

## Email (copy from here)

**Subject:** TarantulApp cart handoff on monarchreptiles.com (quick site tweak?)

---

Hey [Name],

Quick heads up on the TarantulApp side of our partnership. Catalog sync is in good shape. The piece we still need your help on is the handoff when someone checks out on your store.

**What we are building for you**

A keeper browses your inventory inside TarantulApp (tarantulas, cribs, feeders, substrate, supplies). They add whatever they want to a Monarch-only mini cart in our app. When they tap continue, we send them to monarchreptiles.com with those same line items supposed to land in the WooCommerce cart. They pay and checkout on your site like any other customer. We tag the traffic with `utm_source=tarantulapp` and `utm_medium=partner_cart` so you can see it came from us.

That is the experience we want for your customers and for you: we surface the catalog, you keep the sale and fulfillment.

**What is happening today**

We build standard WooCommerce add to cart links (including multiple product IDs in one URL). Right now those requests get **403 Forbidden** on your side, so the cart does not pre fill. We still open your cart page and try a few URL shapes on our end, but until the site accepts those links the flow feels broken compared to what we had in mind.

Example of what we are sending (this one fails today):

```
https://monarchreptiles.com/?add-to-cart=29661,30158,36936&quantity=1,1,1
```

**What we are hoping your dev can help with**

We are not asking for dashboard access or anything heavy. We just need add to cart query URLs to work the way WooCommerce normally expects, so a link from our app can add products to the session cart and send the customer to checkout.

A few ways shops usually solve multi product links (happy to match whatever you pick):

1. A small plugin like [Add Multiple Products to Cart via URL for WooCommerce](https://wordpress.org/plugins/add-multiple-products-to-cart-via-url-for-woocommerce/), often something like  
   `https://monarchreptiles.com/cart/?add-to-cart=29661:1,30158:1,36936:1&utm_source=tarantulapp&utm_medium=partner_cart`

2. A short `template_redirect` snippet that reads comma separated IDs and quantities, calls `WC()->cart->add_to_cart()` for each, then redirects to the cart. [WooCommerce add to cart URL docs](https://woocommerce.com/document/quick-guide-to-woocommerce-add-to-cart-urls/)

3. If multi add is a bigger lift for now, even unblocking single product add on product pages would help us limp along while you scope the rest.

If the 403 is coming from nginx, ModSecurity, or Cloudflare, it may be as simple as allowlisting normal query params on `/`, `/cart/`, and `/product/*` (`add-to-cart`, `quantity`, and our utm params). We are not trying to poke anything weird, just the same pattern other Woo stores use.

**If you are the person who would implement this**

Could you let us know which URL format you want us to standardize on once it works? We will point our app at that shape only. A reply with “use this pattern” plus roughly when it might be live is enough for us to align on our side.

If it is easier to talk it through, happy to do a short call with you and whoever owns the store. We can bring real product IDs from the live catalog.

Thanks for looking at it. This one tweak makes the partnership feel finished on the customer side.

[Mitch / your name]  
TarantulApp  
[your@email.com] · [phone]

---

## After they reply

Note the URL format they chose. Update `PartnerCartHandoffService` if it differs from comma batch or `id:qty` on `/cart/`.

See: [`../operations/monarch-founding-partner-integration.md`](../operations/monarch-founding-partner-integration.md)
