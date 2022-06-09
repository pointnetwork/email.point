import React, { memo } from 'react';

const IdentitySpan: React.FC<{ identity: Identity }> = (props) => {
  const { identity } = props;
  return <span className="text-blue-600 dark:text-blue-300">@{identity}</span>;
};

export default memo(IdentitySpan);
