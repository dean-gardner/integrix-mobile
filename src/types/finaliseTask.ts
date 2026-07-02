import type { FoundUserDTO } from './user';

export type FinaliseTaskDTO = {
  users: FoundUserDTO[];
  shouldBeSentToCrm: boolean;
  signatureImage?: string | null;
  signatureFullName?: string | null;
  signaturePosition?: string | null;
};
