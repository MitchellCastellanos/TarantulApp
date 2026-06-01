# Pickup Points Runbook

Scope: Canada partner checkout, starting with Montreal. Pickup points are approved pet businesses or partner locations that can hold a live animal for a configured number of days.

## Operating Rules

- Admin creates pickup points only. Sellers cannot self-register a pickup point.
- Admin must authorize the seller/partner account before they can use pickup points.
- Authorization means TarantulApp has decided the seller/partner is accountable if a buyer misses pickup.
- A pickup point must be assigned to the official partner.
- Each partner listing must explicitly opt in to each pickup point.
- Buyer pickup is offered only when every item in the cart has the same active pickup point available.
- In-app checkout orders store a pickup snapshot so later edits do not change confirmed buyer instructions.

## Admin Setup

1. Go to Admin > Partner dashboard > Pickup points.
2. Create the pickup point with:
   - public name
   - city/state/country
   - address/postal code
   - hold days
   - public pickup instructions
   - contact details if the pickup partner wants them shown
3. Go to Vendor ops and authorize the user/partner for pickup access.
4. Go to Partner dashboard > Configure on the official partner.
5. Assign the pickup points available to that partner.
6. Select which active listings can use each pickup point.
7. Save partner config.

## Buyer Flow

- Buyer sees pickup only inside in-app TarantulApp checkout.
- The cart calls `/api/public/marketplace/partner-cart/fulfillment-options`.
- If pickup is available, buyer selects the pickup point before payment.
- Order confirmation email includes pickup name, address, hold window, hold-until timestamp, and instructions.

## Missed Pickup

If the buyer does not arrive within the hold window:

1. Pickup partner contacts the seller/partner listed in TarantulApp records.
2. Seller/partner picks up the animal or coordinates return immediately.
3. TarantulApp support documents the incident on the order.
4. Repeat or severe misses should pause pickup authorization for that seller/partner.

## Montreal Spider Co Notes

- Montreal Spider Co can use this flow only when in-app checkout is enabled and its linked TarantulApp user handle matches the official partner slug.
- Admin must authorize that linked user for pickup access.
- Pickup hold days should be agreed per pickup partner before launch.

## Admin Reorg Notes

The admin now has overlapping areas: Vendor ops, Partner dashboard, Marketing, and Marketplace. Recommended next cleanup:

- Rename Partner dashboard to Partner Operations.
- Move official partner setup, imports, checkout, pickup points, and sync runs under Partner Operations.
- Keep Vendor ops for user-level trust grants: verified breeder, official partner promotion, pickup authorization, beta/vendor invite.
- Keep Marketing for outreach, ads, analytics, newsletters, and top vendor campaigns.
- Add a single partner detail page instead of a growing modal once partner operations expands.
