type WindowWithPoint = Window & {
  point: any;
};

type PublicKey = string;

type EncryptedData = {
  encryptedMessage: string;
  encryptedSymmetricObj: Object;
  encryptedSymmetricObjJSON: string;
};

type Address = string;

type Identity = string;

type EmailInputData = [
  number,
  string,
  string,
  number,
  string,
  string,
  boolean,
  boolean,
  boolean,
  string
];

type Email = {
  id: number;
  from: string;
  fromIdentity?: string;
  to: string;
  toIdentity?: string;
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
