import { BigNumber } from 'ethers';
type Address = string;

type EmailWithUserMetadata = {
  id: BigNumber;
  from: Address;
  to: Address[];
  cc: Address[];
  createdAt: BigNumber;
  encryptedMessageId: string;
  encryptedSymmetricObj: string;
  important: boolean;
  deleted: boolean;
  read: boolean;
};

type Metadata = {
  encryptedMessageId: string;
  encryptedSymmetricObj: string;
  important: boolean;
  deleted: boolean;
  read: boolean;
};

type EmailData = {
  id: BigNumber;
  from: Address;
  to: Address[];
  cc: Address[];
  createdAt: BigNumber;
  users: Address[];
  metadata: Metadata[];
};
