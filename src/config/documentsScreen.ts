export type DocumentsSelectValue = string | number | null;

export type DocumentsSelectOption<T extends DocumentsSelectValue = DocumentsSelectValue> = {
  value: T;
  label: string;
};

export type DocumentsFilterForm = {
  documentNumberStr: string;
  description: string;
  createdByName: string;
};

export const DOCUMENT_STATUS_ALL_VALUE = 4;

export const documentStatusOptions: DocumentsSelectOption<number>[] = [
  { value: DOCUMENT_STATUS_ALL_VALUE, label: 'All' },
  { value: 0, label: 'Draft' },
  { value: 1, label: 'Published' },
  { value: 2, label: 'Archived' },
  { value: 3, label: 'In workflow' },
];

export const documentTypeOptions: DocumentsSelectOption<number | null>[] = [
  { value: null, label: 'All' },
  { value: 0, label: 'My documents' },
  { value: 1, label: 'Team documents' },
  { value: 2, label: 'Shared documents' },
];

export const documentSortFieldOptions: DocumentsSelectOption<string>[] = [
  { value: 'documentNumberStr', label: 'Document No' },
  { value: 'description', label: 'Title' },
  { value: 'versionStatusCode', label: 'Status' },
  { value: 'createdByName', label: 'Author' },
  { value: 'createdOnUtc', label: 'Created Date' },
];

export const documentSortOrderOptions: DocumentsSelectOption<number>[] = [
  { value: 0, label: 'Ascending' },
  { value: 1, label: 'Descending' },
];

export const defaultDocumentsFilterForm: DocumentsFilterForm = {
  documentNumberStr: '',
  description: '',
  createdByName: '',
};

export const defaultDocumentsStatusValue = 1;
export const defaultDocumentsTypeValue: number | null = null;
export const defaultDocumentsSortField = 'createdOnUtc';
export const defaultDocumentsSortOrder = 1;
