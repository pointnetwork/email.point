import React, { memo } from 'react';
import { XIcon } from '@heroicons/react/outline';

type Props = { recipient: Identity; onRemoveHandler: Function };

const RecipientBag: React.FC<Props> = (props) => {
  const { recipient, onRemoveHandler } = props;
  return (
    <div
      className="
        rounded-3xl
        bg-gray-200
        py-1
        px-2
        text-sm
        text-gray-500
        flex
        flex-row
        items-center
        justify-center
        m-1
      "
    >
      <button type="button" onClick={() => onRemoveHandler(recipient)}>
        <XIcon className="w-4 h-4 mr-1" />
      </button>
      <span className="font-semibold">@{recipient}</span>
    </div>
  );
};

export default memo(RecipientBag);
