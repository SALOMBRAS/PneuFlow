export function calculateManualPeriod(currentPeriodEnd, approvedAt) {
  const approvedDate = new Date(approvedAt);
  const currentDate = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const base = currentDate && !Number.isNaN(currentDate.getTime()) && currentDate > approvedDate
    ? currentDate
    : approvedDate;
  return {
    periodStart: base.toISOString(),
    periodEnd: new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
}
