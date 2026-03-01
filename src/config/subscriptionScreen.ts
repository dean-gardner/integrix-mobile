import type { SubscriptionReadDTO, SubscriptionTariffs } from '../types/subscription';

export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionPlanKey = 'free' | 'essential' | 'professional' | 'enterprise';

export type SubscriptionFeature = {
  label: string;
  value: string;
};

export type SubscriptionPlan = {
  key: SubscriptionPlanKey;
  title: string;
  tariffPlan: number | null;
  actionText: string;
};

const TARIFF_PLAN = {
  free: 1,
  professional: 2,
  enterprise: 3,
  essential: 4,
} as const;

export const supportEmail = 'support@integri-x.com';

export const subscriptionPlans: SubscriptionPlan[] = [
  { key: 'free', title: 'Free', tariffPlan: TARIFF_PLAN.free, actionText: 'Get started' },
  {
    key: 'essential',
    title: 'Essential',
    tariffPlan: TARIFF_PLAN.essential,
    actionText: 'Get started',
  },
  {
    key: 'professional',
    title: 'Professional',
    tariffPlan: TARIFF_PLAN.professional,
    actionText: 'Get started',
  },
  {
    key: 'enterprise',
    title: 'Enterprise',
    tariffPlan: TARIFF_PLAN.enterprise,
    actionText: 'Contact Us',
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
  billingCycle: BillingCycle
): string {
  const price = getTariffPrice(memberPrices, tariffPlan, billingCycle);
  if (price == null) return '-';
  return `${price} $ / user / ${billingCycle === 'monthly' ? 'month' : 'year'}`;
}

export function getPlanFeatures(
  planKey: SubscriptionPlanKey,
  billingCycle: BillingCycle,
  memberPrices: SubscriptionTariffs | null
): SubscriptionFeature[] {
  if (planKey === 'free') {
    return [
      { label: 'Publish documents', value: '2 per month' },
      { label: 'Finalise tasks', value: '5 per month' },
      { label: 'AI Credits', value: '100 per month' },
      { label: 'Users', value: '5 per month' },
    ];
  }

  if (planKey === 'essential') {
    return [
      { label: 'Publish documents', value: '10 per month' },
      { label: 'Finalise tasks', value: '20 per month' },
      { label: 'AI Credits', value: '1000 per month' },
      { label: 'Users', value: '10 per month' },
      { label: 'Price', value: formatPrice(memberPrices, TARIFF_PLAN.essential, billingCycle) },
    ];
  }

  if (planKey === 'professional') {
    return [
      { label: 'Publish documents', value: 'unlimited' },
      { label: 'Finalise tasks', value: 'unlimited' },
      { label: 'AI Credits', value: 'unlimited' },
      { label: 'Users', value: 'unlimited' },
      { label: 'Price', value: formatPrice(memberPrices, TARIFF_PLAN.professional, billingCycle) },
    ];
  }

  return [
    { label: 'Publish documents', value: 'unlimited' },
    { label: 'Finalise tasks', value: 'unlimited' },
    { label: 'AI Credits', value: 'unlimited' },
    { label: 'Users', value: 'unlimited' },
    { label: 'SAP integration', value: 'available' },
    { label: 'Upload of Assets', value: 'available' },
    { label: 'Custom task completion reports', value: 'By request' },
    { label: 'Report regeneration with updated format', value: 'By request' },
  ];
}
