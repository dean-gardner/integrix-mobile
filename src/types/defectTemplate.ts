export type DefectFieldReadDTO = {
  id: string;
  name: string;
  isRequired: boolean;
  type: number | null;
  options: string | null;
  defectFieldsTemplateId: string;
};

export type DefectFieldsTemplateDTO = {
  id: string;
  name: string;
  details: string;
  companyId: string | null;
  companyName: string | null;
  isSharedWithMe: boolean;
  createdByName: string;
  createdById: string;
  createdOnUtc: string;
  fields: DefectFieldReadDTO[];
};
