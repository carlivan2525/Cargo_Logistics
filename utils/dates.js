/** Pickup = start of today (local). Delivery = pickup + 7 days. */
function getPickupAndDeliveryDates() {
  const pickupDate = new Date();
  pickupDate.setHours(0, 0, 0, 0);

  const deliveryDate = new Date(pickupDate);
  deliveryDate.setDate(deliveryDate.getDate() + 7);

  return { pickupDate, deliveryDate };
}

module.exports = { getPickupAndDeliveryDates };
