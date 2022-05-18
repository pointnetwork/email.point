import React from 'react';
import { useSelector } from 'react-redux';

import { selectors as identitySelectors } from '@store/modules/identity';

import * as ContractService from '@services/ContractService';

import TableView from '@components/TableView';

const Inbox: React.FC<{}> = () => {
  const walletAddress = useSelector(identitySelectors.getWalletAddress);
  const identity = useSelector(identitySelectors.getIdentity);

  let title = 'Sent';
  if (identity) {
    title = `Sent by @${identity}`;
  }

  return (
    <TableView
      title={title}
      getTableItems={() => {
        return ContractService.callContract({
          contract: 'PointEmail',
          method: 'getAllEmailsByFromAddress',
          params: [walletAddress],
        });
      }}
    />
  );
};

export default Inbox;
