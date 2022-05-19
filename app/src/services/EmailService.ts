import * as ContractService from './ContractService';

import EmailMapper from '@mappers/Email';

export async function getEmailData(emailId: string): Promise<Email> {
  const rawEmail: EmailInputData = await ContractService.callContract({
    contract: 'PointEmail',
    method: 'getEmailById',
    params: [emailId],
  });

  const email = await EmailMapper(rawEmail);
  return email;
}

export async function deleteEmail(emailId: number, deleted: boolean = true): Promise<void> {
  await ContractService.sendContract({
    contract: 'PointEmail',
    method: 'deleteEmail',
    params: [emailId, deleted],
  });
}

export async function markEmailAsImportant(
  emailId: number,
  important: boolean = true
): Promise<void> {
  await ContractService.sendContract({
    contract: 'PointEmail',
    method: 'markAsImportant',
    params: [emailId, important],
  });
}

export async function markEmailAsRead(emailId: number, read: boolean = true): Promise<void> {
  await ContractService.sendContract({
    contract: 'PointEmail',
    method: 'markAsRead',
    params: [emailId, read],
  });
}
