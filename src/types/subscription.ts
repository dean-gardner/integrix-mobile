export type SubscriptionReadDTO = {
  id: string;
  companyId: string;
  tariffPlan: number;
  ownerUserId: string;
  ownerUserName: string;
  createdOnUtc: string;
  createdByName: string;
  createdById: string;
  expiresOnUtc: string;
  status: number;
  maxMembersNumber: number | null;
  actualMembersCount: number;
  isStripeBased: boolean;
};

export type SubscriptionTariff = {
  monthlyPrice: number;
  yearlyPrice: number;
  tariffPlan: number;
};

export type SubscriptionTariffs = {
  tarrifs: SubscriptionTariff[];
};

export type ManageSubscriptionMembersDTO = {
  subscriptionId: string;
  userIds: string[];
};

export type SubscriptionCreateDTO = {
  maxMembersNumber?: number;
  ownerUserId: string;
  tariffPlan: number;
  billingCycle: string;
};
