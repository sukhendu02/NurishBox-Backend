# Coupon System — Developer Doc

## Overview

Coupons apply a discount to a user's cart/order. Supports four scopes: `GLOBAL`, `KITCHEN`, `USER`, `PROMOTER`. Three discount types: `FLAT`, `PERCENT`, `FREE_DELIVERY`. One coupon per order — no stacking.

---

## Data Models

### `Coupon`
Rule definition — what a code does.

| Field | Notes |
|---|---|
| `code` | Unique, uppercase |
| `scope` | `GLOBAL` \| `KITCHEN` \| `USER` \| `PROMOTER` |
| `userId` | Set only if `scope = USER` |
| `promoterId` | Set only if `scope = PROMOTER` (tag only, no dashboard in v1) |
| `discountType` | `FLAT` \| `PERCENT` \| `FREE_DELIVERY` |
| `discountValue` | Ignored for `FREE_DELIVERY` |
| `maxDiscountAmount` | Cap, relevant for `PERCENT` |
| `minOrderValue` | Checked against whole cart subtotal |
| `firstOrderOnly` | Boolean |
| `usageLimitTotal` / `usageLimitPerUser` | Null = unlimited |
| `startAt` / `endAt` / `isActive` | Validity window |

### `CouponRedemption`
Usage log — one row per successful use. Separate from `Coupon` to avoid race conditions on usage counters and to support per-order/per-user limit queries.

| Field | Notes |
|---|---|
| `orderId` | **Unique** — enforces one coupon per order at DB level |
| `discountAmount` | Frozen value at redemption time, never recalculated |
| `status` | `ACTIVE` \| `VOIDED` (voided on cancel/refund) |

### `Cart.appliedCouponId`
FK to `Coupon`. Nullable. Re-validated on every cart fetch — silently cleared if no longer eligible (expired, limit hit, cart changed).

### `Order` — added fields
`couponId`, `couponCode`, `discountAmount` — frozen at order placement, source of truth for that order regardless of later coupon edits.

---

## Core Logic

### `validateCoupon(code, userId, cart, kitchenId)`
Pure validation function, used everywhere a coupon is checked. `cart` param only needs `{ subtotal, deliveryFee }`.

Checks in order: exists → active → date window → scope match → first-order-only → min order value → usage limits (total + per-user) → free-delivery-not-already-free. Returns `{ valid, discountAmount, coupon }` or `{ valid: false, reason, message }`.

**Important:** `deliveryFee` must be the **raw, pre-coupon** fee. Never pass an already-discounted value in — this was a real bug (see Gotchas).

### `applyCouponToCartSummary(userId, appliedCouponId, cartSummary, kitchenId)`
Used by `getCartService2` on every cart fetch. Re-validates the stored `appliedCouponId`; if invalid, silently clears it from the cart row and returns zeroed discount — no error shown to user, cart just reflects current truth.

### `calculateDiscountAmount(coupon, eligibleSubtotal, deliveryFee)`
- `FLAT` → `min(discountValue, eligibleSubtotal)`
- `PERCENT` → `eligibleSubtotal * (discountValue / 100)`, capped by `maxDiscountAmount`
- `FREE_DELIVERY` → returns `deliveryFee` itself (the fee becomes the discount — fee is still shown to user, discount cancels it out in the total)

---

## Flows

### Cart (apply / remove / fetch)
1. `POST /coupon/apply` → validate → store `appliedCouponId` on cart → return updated cart
2. `POST /coupon/remove` → clear `appliedCouponId` → return updated cart
3. Every cart fetch (`getCartService2`) → re-validates stored coupon, recomputes `totalAmount = subtotal + deliveryFee - discount`

### Order placement (`payandplaceOrderService`)
1. Re-validate coupon fresh (don't trust cart's last response — cart could be stale)
2. If invalid → **block order placement** with clear error (no silent price change after checkout)
3. Compute real `deliveryFee` using resolved `distanceKm` — must call `calculateEtaService2` before `calculateCartTotals`
4. **COD** → redeem immediately (create `CouponRedemption`, clear `appliedCouponId`) in the same transaction as order creation
5. **RAZORPAY** → do *not* redeem yet — only freeze `couponId`/`discountAmount` on the order

### Payment success (RAZORPAY only)
Redemption happens in `verifyPaymentService` (user-initiated) **and** webhook `payment.captured` (fallback) — both guarded by checking `CouponRedemption` doesn't already exist for that `orderId`, plus a unique DB constraint as a backstop.

### Cancellation / Refund
`cancelOrderService` (user-cancel) and webhook `refund.processed` both void the redemption:
```js
CouponRedemption.update({ status: 'VOIDED' }, { where: { orderId, status: 'ACTIVE' } })
```
Frees up usage count. Only `PENDING`/`CONFIRMED` orders are cancellable.

---

## Known Gotchas (already hit these — don't repeat)

- **`deliveryFee` must never be mutated in place.** Keep a `baseDeliveryFee` (raw, from `calculateCartTotals`) separate from any coupon-adjusted value. Passing an already-zeroed fee back into `validateCoupon` breaks the `FREE_DELIVERY` check.
- **`calculateCartTotals(items, distance)` needs real `distance`.** Omitting it silently returns `deliveryFee: 0` (no error) — order placement was missing this call entirely until fixed; always call `calculateEtaService2` first.
- **Guests never get coupons.** No `userId` breaks `firstOrderOnly` and `USER` scope checks — block coupon UI/endpoints for guest sessions entirely.
- **Response envelope mismatches silently break frontend.** If your API wraps responses (e.g. `{ success, response }`), unwrap consistently — a shape mismatch shows as "coupon can't be applied" with zero indication of the real cause.

---

## Deferred (not yet built)

- Row-level lock (`SELECT ... FOR UPDATE`) on coupon during redemption — usage-limit race condition still possible under concurrent load
- Abandoned/expired Razorpay order cleanup job
- Product/category-level coupon restriction (schema exists, filtering logic commented out)
- Admin CRUD UI for coupons (currently direct SQL/seed only)
- Coupon discovery/listing endpoint ("available coupons for you")
- Auto-refund trigger on cancellation (currently marks `REFUND_PENDING`, manual follow-up)