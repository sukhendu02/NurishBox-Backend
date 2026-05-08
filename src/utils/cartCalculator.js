// src/utils/cartCalculator.js

export const calculateCartTotals = (items) => {
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

  const deliveryFee   = subtotal >= 399 ? 0 : 30;
  const totalAmount   = subtotal + deliveryFee;

  return {
    items:          enrichedItems,
    itemCount,
    subtotal:       parseFloat(subtotal.toFixed(2)),
    totalSavings:   parseFloat(totalSavings.toFixed(2)),
    deliveryFee,
    totalAmount:    parseFloat(totalAmount.toFixed(2)),
    freeDeliveryIn: subtotal < 399
      ? parseFloat((399 - subtotal).toFixed(2))
      : 0,
  };
};