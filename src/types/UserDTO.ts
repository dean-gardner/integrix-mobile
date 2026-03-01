export type UserDTO = {
  id: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  companyId: string;
  companyTeamId: number;
  roles: string[];
  isRoleUpdated: boolean;
  photoUrl: string | null;
  subscriptionId?: string | null;
  timeZoneId: string;
  tariffPlan: number;
};
