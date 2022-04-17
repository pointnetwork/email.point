import React from 'react';

import * as ContractService from '@services/ContractService';

import TableView from '@components/TableView';

const Inbox: React.FC<{}> = () => {
  return (
    <TableView
      title="Important"
      getTableItems={() => {
        return ContractService.callContract({
          contract: 'PointEmail',
          method: 'getImportantEmails',
          params: [],
        });
      }}
    />
  );
};

export default Inbox;
