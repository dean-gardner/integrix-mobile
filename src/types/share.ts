import type { FoundUserDTO } from './user';

export type ShareItemsDTO<T extends string | number> = {
  itemsIds: T[];
  usersToShare: FoundUserDTO[];
};
