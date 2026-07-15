export const PAYMENT_STATUS_POLL_DELAYS = Object.freeze([0, 2000, 2000, 2000, 2000, 2000, 2000, 2000]);

export function hasPaymentPollingTimedOut(attempt) {
  return attempt >= PAYMENT_STATUS_POLL_DELAYS.length - 1;
}
