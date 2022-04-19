import * as IdentityService from '@services/IdentityService';
import * as StorageService from '@services/StorageService';
import * as WalletService from '@services/WalletService';

export default async function EmailMapper(inputData: EmailInputData): Promise<Email> {
  const [id, from, to, createdAt, encryptedMessageId, encryptedSymmetricObj, important, deleted] =
    inputData;

  const [fromIdentity, toIdentity, encryptedData] = await Promise.all([
    IdentityService.ownerToIdentity(from),
    IdentityService.ownerToIdentity(from),
    StorageService.getString(encryptedMessageId),
  ]);

  const decryptedMessage = await WalletService.decryptData(encryptedData, encryptedSymmetricObj);

  let message;
  let subject;

  try {
    const json = JSON.parse(decryptedMessage);
    message = json.message;
    subject = json.subject;
  } catch (error) {}

  return {
    id,
    from,
    fromIdentity,
    to,
    toIdentity,
    encryptedMessageId,
    encryptedSymmetricObj,
    createdAt: createdAt * 1000,
    subject,
    message,
    important,
    deleted,
  };
}
