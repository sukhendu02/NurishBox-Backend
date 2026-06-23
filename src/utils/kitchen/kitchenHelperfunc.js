// src/modules/kitchen/utils/kitchenStatus.js

/**
 * Check if a kitchen is operational and accepting orders
 *
 * @param {{ isActive: boolean, acceptingOrders: boolean, name: string }} kitchen
 * @returns {{ canAcceptOrders: boolean, message: string }}
 *
 * @example
 * getKitchenStatus(kitchen)
 * // → { canAcceptOrders: true, message: 'Kitchen is open and accepting orders' }
 * // → { canAcceptOrders: false, message: 'Kitchen is currently unavailable' }
 * // → { canAcceptOrders: false, message: 'Kitchen is not accepting orders right now' }
 */
export function getKitchenStatus(kitchen) {
  if (!kitchen.isActive) {
    return {
      canAcceptOrders: false,
      message:         'Kitchen is currently unavailable',
    }
  }

  if (!kitchen.acceptingOrders) {
    return {
      canAcceptOrders: false,
      message:         'Kitchen is not accepting orders right now',
    }
  }

  return {
    canAcceptOrders: true,
    message:         'Kitchen is open and accepting orders',
  }
}