import * as IdentityService from '@services/IdentityService';
import * as StorageService from '@services/StorageService';
import * as EncryptionService from '@services/EncryptionService';

export default async function EmailMapper(inputData: EmailInputData): Promise<Email> {
  const [
    id,
    from,
    to,
    encryptedMessageId,
    createdAt,
    encryptedSymmetricObj,
    important,
    deleted,
    read,
  ] = inputData;

  const [fromIdentity, encryptedData] = await Promise.all([
    IdentityService.ownerToIdentity(from),
    StorageService.getString(encryptedMessageId),
  ]);

  console.log(encryptedData);

  const { decryptedMessage } = await EncryptionService.decryptStringMulti(
    encryptedData,
    encryptedSymmetricObj
  );

  let message;
  let subject;
  let attachments;
  try {
    const json = JSON.parse(decryptedMessage);
    message = json.message;
    subject = json.subject;
    attachments = json.attachments;
  } catch (error) {}

  return {
    id,
    from,
    fromIdentity,
    to,
    encryptedMessageId,
    encryptedSymmetricObj,
    createdAt: createdAt * 1000,
    subject,
    message,
    important,
    deleted,
    read,
    attachments,
  };
}
