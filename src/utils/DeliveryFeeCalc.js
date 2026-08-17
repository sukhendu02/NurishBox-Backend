import { DELIVERY_CONFIG } from "../Config/DeliveryConfig.js";
const {
    FREE_ORDER_AMOUNT,
    freeDistance,
    baseFee,
    rates,
} = DELIVERY_CONFIG;

export function calculateDeliveryFee(subtotal, distanceKm) {
  // Free delivery
//   console.log(subtotal,freeDistance,rates,distanceKm)
  if (subtotal >= FREE_ORDER_AMOUNT && distanceKm <= freeDistance) {
    return 0;
  }

  // Orders below ₹199
  if (subtotal < FREE_ORDER_AMOUNT) {
    return calculateFullDistanceFee(distanceKm);
  }
  

  // Orders >= ₹199 but beyond free radius
  return calculateExtraDistanceFee(distanceKm);
}

function calculateFullDistanceFee(distanceKm) {
  let fee = baseFee;

  if (distanceKm <= 6) {
    fee += distanceKm * rates.rates_0_6;
  } else if (distanceKm <= 10) {
    fee +=
      (6 * rates.rates_0_6) +
      ((distanceKm - 6) * rates.rates_6_10);
  } else {
    fee +=
      (6 * rates.rates_0_6) +
      (4 * rates.rates_6_10) +
      ((distanceKm - 10) * rates.rates_above_10);
  }

  return Math.round(fee);
}

function calculateExtraDistanceFee(distanceKm) {
  let fee = baseFee;

  const extra = distanceKm - freeDistance;

  if (extra <= 4) {
    fee += extra * rates.rates_6_10;
  } else {
    fee +=
      (4 * rates.rates_6_10) +
      ((extra - 4) * rates.rates_above_10);
  }

  return Math.round(fee);
}


// console.log(calculateDeliveryFee(209,6.5));
console.log(calculateDeliveryFee(599.55,10.4));