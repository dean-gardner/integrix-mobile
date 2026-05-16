import type { FoundUserDTO } from './user';

export type TaskSignatureMode = 'Draw' | 'Type';

export type FinaliseTaskDTO = {
  users: FoundUserDTO[];
  shouldBeSentToCrm: boolean;
  signature?: string | null;
  fullName?: string | null;
  position?: string | null;
  signatureType?: TaskSignatureMode | null;
};
