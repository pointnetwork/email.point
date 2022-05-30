import * as IdentityService from '@services/IdentityService';
import * as StorageService from '@services/StorageService';
import * as WalletService from '@services/WalletService';

export default async function EmailMapper(inputData: EmailInputData): Promise<Email> {
  const [
    id,
    from,
    to,
    cc,
    createdAt,
    encryptedMessageId,
    encryptedSymmetricObj,
    important,
    deleted,
    read,
  ] = inputData;

  const [fromIdentity, encryptedData] = await Promise.all([
    IdentityService.ownerToIdentity(from),
    StorageService.getString(encryptedMessageId),
  ]);

  const decryptedMessage = await WalletService.decryptData(encryptedData, encryptedSymmetricObj);

  let message;
  let subject;
  let attachments;
  let encryptionKey;
  try {
    const json = JSON.parse(decryptedMessage);
    message = json.message;
    subject = json.subject;
    attachments = json.attachments;
    encryptionKey = json.encryptionKey;
  } catch (error) {}

  return {
    id,
    from,
    fromIdentity,
    to,
    cc,
    encryptedMessageId,
    encryptedSymmetricObj,
    createdAt: createdAt * 1000,
    subject,
    message,
    important,
    deleted,
    read,
    attachments,
    encryptionKey,
  };
}
