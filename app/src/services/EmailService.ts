import * as ContractService from './ContractService';

import EmailMapper from '@mappers/Email';

export async function getEmailData(messageId: string) {
  const rawEmail: EmailInputData = await ContractService.callContract({
    contract: 'PointEmail',
    method: 'getMessageById',
    params: [messageId],
  });

  const email = await EmailMapper(rawEmail);
  console.log(email);
  return email;
}
