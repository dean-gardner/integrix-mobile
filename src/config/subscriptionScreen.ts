import type { TFunction } from 'i18next';
import { config } from '../config';
import type { CompanyReadDTO } from '../types/company';
import type { SubscriptionReadDTO, SubscriptionTariffs } from '../types/subscription';

/** Matches integrix `CompanyTypeEnum.MiningCompany`. */
const COMPANY_TYPE_MINING_COMPANY = 1;

export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionPlanKey = 'free' | 'essential' | 'professional' | 'enterprise';

export type SubscriptionFeature = {
  label: string;
  value: string;
};

export type SubscriptionPlan = {
  key: SubscriptionPlanKey;
  titleKey: string;
  tariffPlan: number | null;
  actionKey: string;
};

/** Aligns with backend / integrix-app-for-mobile TariffPlanEnum. */
export const TARIFF_PLAN = {
  free: 1,
  professional: 2,
  enterprise: 3,
  essential: 4,
} as const;

/** Paid Stripe checkout plans — API expects maxMembersNumber (see web Subscription + CalculatorModal). */
export function tariffRequiresMemberCountForCheckout(tariffPlan: number): boolean {
  return tariffPlan === TARIFF_PLAN.essential || tariffPlan === TARIFF_PLAN.professional;
}

/**
 * **Web parity (important for Stripe checkout)**  
 * In `integrix-app-for-mobile` → `Components/Pages/Subscription/Subscription.tsx`, the calculator’s
 * `onSubscribeClick` is always `handleProSubscription`, which calls `createSubscription` with
 * `tariffPlan: TariffPlanEnum.Pro` (2) — even when the user tapped **Essential** (only the displayed
 * `price` in the modal comes from Essential; the POST body still uses Pro).
 *
 * The API builds Stripe Checkout line items from that tariff; sending **Essential (4)** from mobile
 * can produce Stripe’s error: *"You must provide one of `price` or `price_data` for each line item"*
 * if no Stripe Price is configured for tariff 4.
 *
 * **TODO:** When `integrix-api` registers Stripe prices for Essential and web sends the selected
 * tariff, return `uiTariffPlan` unchanged for Essential and update web accordingly.
 */
export function getTariffPlanForPaidCheckoutApiRequest(uiTariffPlan: number): number {
  if (uiTariffPlan === TARIFF_PLAN.essential) {
    return TARIFF_PLAN.professional;
  }
  return uiTariffPlan;
}

/**
 * Same rule as web `Subscription.tsx`: mining companies use a higher minimum seat count.
 */
export function getMinimalMembersNumberForCompany(company: CompanyReadDTO | null | undefined): number {
  if (company?.type === COMPANY_TYPE_MINING_COMPANY) {
    return config.subscription_MinMembersOfMiningCompany;
  }
  return config.subscription_MinMembersOfOthers;
}

/**
 * Default `maxMembersNumber` for `api/subscriptions/create` — mirrors web calculator initial value:
 * `intialMembersNumber` + must cover current subscription seat usage.
 */
export function getDefaultMaxMembersForSubscriptionCheckout(
  subscription: SubscriptionReadDTO | null | undefined,
  company: CompanyReadDTO | null | undefined
): number {
  const minimalMembersNumber = getMinimalMembersNumberForCompany(company);
  const intialMembersNumber =
    company && minimalMembersNumber > (company.usersCount ?? 0)
      ? minimalMembersNumber
      : company?.usersCount ?? minimalMembersNumber;

  const fromRecord = Math.max(
    subscription?.actualMembersCount ?? 0,
    subscription?.maxMembersNumber ?? 0
  );

  return Math.max(minimalMembersNumber, intialMembersNumber, fromRecord);
}

export const supportEmail = 'support@integri-x.com';

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    key: 'free',
    titleKey: 'subscription.free',
    tariffPlan: TARIFF_PLAN.free,
    actionKey: 'subscription.getStarted',
  },
  {
    key: 'essential',
    titleKey: 'subscription.essential',
    tariffPlan: TARIFF_PLAN.essential,
    actionKey: 'subscription.getStarted',
  },
  {
    key: 'professional',
    titleKey: 'subscription.professional',
    tariffPlan: TARIFF_PLAN.professional,
    actionKey: 'subscription.getStarted',
  },
  {
    key: 'enterprise',
    titleKey: 'subscription.enterprise',
    tariffPlan: TARIFF_PLAN.enterprise,
    actionKey: 'subscription.contactUs',
  },
];

export function getCurrentPlanKey(
  subscription: SubscriptionReadDTO | null | undefined
): SubscriptionPlanKey {
  if (!subscription) return 'free';
  if (subscription.tariffPlan === TARIFF_PLAN.free) return 'free';
  if (subscription.tariffPlan === TARIFF_PLAN.essential) return 'essential';
  if (subscription.tariffPlan === TARIFF_PLAN.professional) return 'professional';
  return 'enterprise';
}

function getTariffPrice(
  memberPrices: SubscriptionTariffs | null,
  tariffPlan: number,
  billingCycle: BillingCycle
): number | null {
  const tariff = memberPrices?.tarrifs?.find((item) => item.tariffPlan === tariffPlan);
  if (!tariff) return null;
  return billingCycle === 'monthly' ? tariff.monthlyPrice : tariff.yearlyPrice;
}

function formatPrice(
  memberPrices: SubscriptionTariffs | null,
  tariffPlan: number,
  billingCycle: BillingCycle,
  t: TFunction
): string {
  const price = getTariffPrice(memberPrices, tariffPlan, billingCycle);
  if (price == null) return '-';
  const period =
    billingCycle === 'monthly' ? t('subscription.periodMonth') : t('subscription.periodYear');
  return t('subscription.priceFormat', { price, period });
}

export function getPlanFeatures(
  planKey: SubscriptionPlanKey,
  billingCycle: BillingCycle,
  memberPrices: SubscriptionTariffs | null,
  t: TFunction
): SubscriptionFeature[] {
  const perMonth = (n: number) => t('subscription.feature.nPerMonth', { n });
  const u = t('subscription.feature.unlimited');
  const av = t('subscription.feature.available');
  const br = t('subscription.feature.byRequest');

  if (planKey === 'free') {
    return [
      { label: t('subscription.feature.publishDocs'), value: perMonth(2) },
      { label: t('subscription.feature.finalizeTasks'), value: perMonth(5) },
      { label: t('subscription.feature.aiCredits'), value: perMonth(100) },
      { label: t('subscription.feature.users'), value: perMonth(5) },
    ];
  }

  if (planKey === 'essential') {
    return [
      { label: t('subscription.feature.publishDocs'), value: perMonth(10) },
      { label: t('subscription.feature.finalizeTasks'), value: perMonth(20) },
      { label: t('subscription.feature.aiCredits'), value: perMonth(1000) },
      { label: t('subscription.feature.users'), value: perMonth(10) },
      {
        label: t('subscription.feature.price'),
        value: formatPrice(memberPrices, TARIFF_PLAN.essential, billingCycle, t),
      },
    ];
  }

  if (planKey === 'professional') {
    return [
      { label: t('subscription.feature.publishDocs'), value: u },
      { label: t('subscription.feature.finalizeTasks'), value: u },
      { label: t('subscription.feature.aiCredits'), value: u },
      { label: t('subscription.feature.users'), value: u },
      {
        label: t('subscription.feature.price'),
        value: formatPrice(memberPrices, TARIFF_PLAN.professional, billingCycle, t),
      },
    ];
  }

  return [
    { label: t('subscription.feature.publishDocs'), value: u },
    { label: t('subscription.feature.finalizeTasks'), value: u },
    { label: t('subscription.feature.aiCredits'), value: u },
    { label: t('subscription.feature.users'), value: u },
    { label: t('subscription.feature.sapIntegration'), value: av },
    { label: t('subscription.feature.uploadAssets'), value: av },
    { label: t('subscription.feature.customReports'), value: br },
    { label: t('subscription.feature.reportRegen'), value: br },
  ];
}
