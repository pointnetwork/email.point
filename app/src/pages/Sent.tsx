import React from 'react';
import { useSelector } from 'react-redux';

import { selectors as identitySelectors } from '@store/modules/identity';

import * as ContractService from '@services/ContractService';

import TableView from '@components/TableView';
import IdentitySpan from '@components/IdentitySpan';

const Inbox: React.FC<{}> = () => {
  const walletAddress = useSelector(identitySelectors.getWalletAddress);
  const identity = useSelector(identitySelectors.getIdentity);

  let title = <span>Sent</span>;
  if (identity) {
    title = (
      <span>
        Sent by <IdentitySpan identity={identity} />
      </span>
    );
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
