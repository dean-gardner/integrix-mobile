export type CompanyTeamNodeDTO = {
  id: number;
  parentId: number | null;
  name: string;
};

export type CompanyTeamCreateEditDTO = {
  name: string;
  parentTeamId: number | null;
};

export type CompanyTeamEditDTO = {
  id: number;
  name: string;
  parentTeamId: number | null;
};

/** Team the current user can join (get-teams-to-join-by-companyid). */
export type CompanyTeamReadDTO = {
  id: number;
  name: string;
  companyId: string;
  parentTeamId: number | null;
};

/** Payload for join-team. */
export type JoinTeamDTO = {
  token: string | null;
};

/** Payload for request-new-team. */
export type TeamCreationRequestDTO = {
  teamName: string;
  token: string | null;
  invitationId: string | null;
};

/** Payload for reassign-parent-node (move team under another parent). */
export type ReassignParentNodeDTO = {
  currentNodeId: number;
  newParentNodeId: number;
};
