export const PAYMENT_STATUS_POLL_DELAYS = Object.freeze([0, 1000, 2000, 3000, 5000, 8000, 10000, 12000]);

export function hasPaymentPollingTimedOut(attempt) {
  return attempt >= PAYMENT_STATUS_POLL_DELAYS.length - 1;
}
