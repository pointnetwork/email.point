declare module 'crypto-aes-gcm';

type WindowWithPoint = Window & {
  point: any;
};

type EncryptedData = {
  encryptedMessage: string;
  encryptedSymmetricObj: Object;
  encryptedSymmetricObjJSON: string;
};

type Address = string;
type Owner = string;
type Identity = string;
type PublicKey = string;

type EmailInputData = [
  number, // id
  string, // from
  string[], // to
  string[], // cc
  number, // createdAt
  string, // encryptedMessageId
  string, // encryptedSymmetricObj
  boolean, // important
  boolean, // deleted
  boolean // read
];

type Email = {
  id: number;
  from: string;
  fromIdentity?: string;
  to: string[];
  cc: string[];
  subject?: string;
  message?: string;
  encryptedMessageId: string;
  encryptedSymmetricObj: string;
  createdAt: number;
  checked?: boolean;
  important?: boolean;
  deleted?: boolean;
  read?: boolean;
  attachments?: Array;
  encryptionKey?: string;
};

type Event = {
  address: string;
  blockHash: string;
  blockNumber: number;
  event: string;
  id: string;
  logIndex: number;
  returnValues: Record<any, any>;
};

type ContractCallResponse = {
  blockHash: string;
  blockNumber: number;
  cumulativeGasUsed: number;
  events: Record<string, Event>;
};

type EventSubscription = {
  unsubscribe: Function;
  subscribe: Function;
};
