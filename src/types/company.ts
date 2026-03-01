/**
 * Company API types – user's company (api/companies/user).
 */
export type CompanyReadDTO = {
  id: string;
  name: string;
  createdOnUtc: string;
  createdBy: string;
  ModifiedOnUtc: string;
  ModifiedBy: string;
  isDeleted: boolean;
  logoUrl: string;
  type: number;
  teamsCount: number;
  usersCount: number;
  assetsCount: number;
  documentsCount: number;
  tasksCount: number;
  companyDomains: string;
};
