/** Pickup = today (Philippines). Delivery = pickup + 7 days. */
function getPickupAndDeliveryDates() {
  const phNow = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })
  );
  const pickupDate = new Date(phNow.getFullYear(), phNow.getMonth(), phNow.getDate());
  const deliveryDate = new Date(pickupDate);
  deliveryDate.setDate(deliveryDate.getDate() + 7);
  return { pickupDate, deliveryDate };
}

module.exports = { getPickupAndDeliveryDates };
