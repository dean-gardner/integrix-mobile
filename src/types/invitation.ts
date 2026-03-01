export type UserInvitationReadDTO = {
  id: string;
  fullName: string;
  sendOn: string;
  email: string;
  team: string;
  phoneNumber: string;
  status: number;
  companyId: string;
};

export type UserInvitationCreateDTO = {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  userRoleId: string;
  companyTeamId: number | null;
};

export type UserInvitationFilteringModel = {
  pageNumber: number;
  pageSize: number;
  sortingField?: string | null;
  sortingOrder?: number;
};

export const InvitationStatus = {
  Pending: 0,
  Expired: 1,
  Accepted: 2,
} as const;

export function toInvitationStatusLabel(status: number): string {
  if (status === InvitationStatus.Pending) return 'Pending';
  if (status === InvitationStatus.Expired) return 'Expired';
  if (status === InvitationStatus.Accepted) return 'Accepted';
  return 'Unknown';
}
