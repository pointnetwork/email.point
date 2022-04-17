import React from 'react';

import * as ContractService from '@services/ContractService';

import TableView from '@components/TableView';

const Inbox: React.FC<{}> = () => {
  return (
    <TableView
      title="Trash folder"
      getTableItems={() => {
        return ContractService.callContract({
          contract: 'PointEmail',
          method: 'getDeletedEmails',
          params: [],
        });
      }}
    />
  );
};

export default Inbox;
