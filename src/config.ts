/**
 * App config – aligns with integrix-app-for-mobile API base.
 * Subscription minimums must match `integrix-app-for-mobile/src/settings/config*.json`
 * (backend enforces the same rules → "Minimal members number rule violated.").
 */
export const config = {
  apiUrl: 'https://api.integri-x.com/',
  subscription_MinMembersOfMiningCompany: 10,
  subscription_MinMembersOfOthers: 2,
} as const;
