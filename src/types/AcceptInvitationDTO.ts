export type AcceptInvitationDTO = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  companyTeamId: number | null;
  companyType?: number | null;
  companyName?: string | null;
  timeZoneId: string;
};
