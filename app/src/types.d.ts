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

type EmailInputData = [number, string, string, number, string, string, boolean, boolean];

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
};
