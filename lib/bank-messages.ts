// User-facing wording for the bank picker. Kept apart from bank-list.service (server-only: it
// pulls in the Anchor client and next/cache) so the forms can show the same text the actions return.

export const BANK_LIST_UNAVAILABLE =
  "We couldn't load the list of banks just now. Please refresh the page and try again in a moment.";

export const BANK_NOT_RECOGNISED =
  "We don't recognise that bank selection. Please refresh the page and choose your bank again.";
