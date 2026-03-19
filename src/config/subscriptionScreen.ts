import type { TFunction } from 'i18next';
import type { SubscriptionReadDTO, SubscriptionTariffs } from '../types/subscription';

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

const TARIFF_PLAN = {
  free: 1,
  professional: 2,
  enterprise: 3,
  essential: 4,
} as const;

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
