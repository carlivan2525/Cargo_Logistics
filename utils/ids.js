/** Next sequential ID from highest existing (avoids duplicate key after deletes). */
async function nextSequentialId(Model, field, prefix, pad = 4) {
  const latest = await Model.findOne().sort({ [field]: -1 }).select(field).lean();
  const match = latest?.[field]?.match(/(\d+)$/);
  const n = match ? parseInt(match[1], 10) + 1 : 1;
  return `${prefix}-${String(n).padStart(pad, '0')}`;
}

module.exports = { nextSequentialId };
