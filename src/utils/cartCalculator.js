// src/utils/cartCalculator.js

import { calculateDeliveryFee } from "./DeliveryFeeCalc.js";
import { DELIVERY_CONFIG } from "../Config/DeliveryConfig.js";
export const calculateCartTotals = (items,distance) => {
  let subtotal     = 0;
  let totalSavings = 0;
  let itemCount    = 0;

  const enrichedItems = items.map((item) => {
    const product         = item.product;
    const basePrice    = parseFloat(product.basePrice);
    const finalPrice   = product.discountPrice
      ? parseFloat(product.discountPrice)
      : basePrice;
    const savings      = basePrice - finalPrice;
    const itemTotal    = finalPrice * item.quantity;
    const itemSavings  = savings   * item.quantity;

    subtotal     += itemTotal;
    totalSavings += itemSavings;
    itemCount    += item.quantity;

    return {
      id:       item.id,
      quantity: item.quantity,
      product: {
        id:           product.id,
        name:         product.name,
        imageUrl:     product.imageUrl,
        basePrice,
        discountPrice: product.discountPrice
          ? parseFloat(product.discountPrice)
          : null,
        finalPrice,
        isAvailable:  product.isAvailable,
      },
      unitPrice:  finalPrice,
      itemTotal,
      itemSavings: itemSavings > 0 ? itemSavings : 0,
      hasDiscount: savings > 0,
    };
  });
 

  const deliveryFee   = calculateDeliveryFee(subtotal,distance) || 0;
  const totalAmount   = subtotal + deliveryFee;

  return {
    items:          enrichedItems,
    itemCount,
    subtotal:       parseFloat(subtotal.toFixed(2)),
    totalSavings:   parseFloat(totalSavings.toFixed(2)),
    deliveryFee,
    totalAmount:    parseFloat(totalAmount.toFixed(2)),
    freeDeliveryIn: subtotal < DELIVERY_CONFIG.FREE_ORDER_AMOUNT
      ? parseFloat((DELIVERY_CONFIG.FREE_ORDER_AMOUNT - subtotal).toFixed(2))
      : 0,
  };
};