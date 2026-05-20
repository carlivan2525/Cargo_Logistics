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

/** Parse YYYY-MM-DD or ISO date from customer JSON */
function parseDateInput(value) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

module.exports = { getPickupAndDeliveryDates, parseDateInput };
