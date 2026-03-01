/**
 * User list types – aligned with api/users/get-users.
 */
export type { EntitiesWithTotalCount } from './common';

export type UserFilteringModel = {
  pageNumber: number;
  pageSize: number;
  sortingField?: string | null;
  sortingOrder?: number;
  fullName?: string;
  email?: string;
  team?: string;
  role?: string;
  companyId?: string | null;
  lastAccessUtc?: string;
};

export type UserReadDTO = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  team: string;
  company: string;
  companyName?: string; // alias for company (some endpoints)
  companyId: string;
  role: string;
  lastAccessUtc: string;
  photoUrl: string | null;
  subscriptionId?: string | null;
  isSubscriptionOwner?: boolean;
  subscriptionTariff?: string;
};

/** Search params for get-users-by-search (share/assign flows). */
export type UserSearchModelDTO = {
  search: string;
  shouldFindTeams?: boolean;
  onlyRegisteredUsers?: boolean;
  onlyCompanyTeamUsers?: boolean;
  includeOwnPerson?: boolean;
};

/** User search result (e.g. for share/assign). */
export type FoundUserDTO = {
  fullName: string | null;
  email: string;
  userId: string | null;
  companyTeam: { id: number; name: string; companyId: string; parentTeamId: number | null } | null;
  isImplicitShare?: boolean | null;
};

/** Admin edit user (api/users/edit-user). */
export type UserEditDTO = {
  id: string;
  firstName: string;
  lastName: string;
  companyTeamId: number;
  roleId: string;
};

/** Role for edit-user dropdown (api/auth/get-all-roles). */
export type RoleDTO = {
  id: string;
  name: string;
};
