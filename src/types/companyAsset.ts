export const CompanyAssetStatus = {
  Active: 0,
  Shared: 1,
  Archived: 2,
} as const;
export type CompanyAssetStatus = (typeof CompanyAssetStatus)[keyof typeof CompanyAssetStatus];

export type CompanyAssetNodeDTO = {
  id: number;
  parentId: number | null;
  name: string;
  namePrefix: string | null;
  externalId: string;
  hasChildren: boolean;
  childrenAreLoded?: boolean;
};

export type CompanyAssetCreateDTO = {
  name: string;
  parentId: number | null;
  externalId: string;
};

export type ReassignParentNodeDTO = {
  currentNodeId: number;
  newParentNodeId: number | null;
};

/** Result from get-assets-by-search. */
export type CompanyAssetReadDTO = {
  id: number;
  name: string;
  externalId: string;
  companyId: string;
  companyName: string | null;
  parentName: string | null;
  createdOn?: string;
};
