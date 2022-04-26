import * as ContractService from './ContractService';

import EmailMapper from '@mappers/Email';

export async function getEmailData(messageId: string): Promise<Email> {
  const rawEmail: EmailInputData = await ContractService.callContract({
    contract: 'PointEmail',
    method: 'getMessageById',
    params: [messageId],
  });

  const email = await EmailMapper(rawEmail);
  return email;
}

export async function deleteEmail(
  encryptedMessageId: string,
  deleted: boolean = true
): Promise<void> {
  ContractService.sendContract({
    contract: 'PointEmail',
    method: 'deleteMessage',
    params: [encryptedMessageId, deleted],
  });
}

export async function markEmailAsImportant(
  encryptedMessageId: string,
  important: boolean = true
): Promise<void> {
  await ContractService.sendContract({
    contract: 'PointEmail',
    method: 'markAsImportant',
    params: [encryptedMessageId, important],
  });
}

export async function markEmailAsRead(
  encryptedMessageId: string,
  read: boolean = true
): Promise<void> {
  await ContractService.sendContract({
    contract: 'PointEmail',
    method: 'markAsRead',
    params: [encryptedMessageId, read],
  });
}
