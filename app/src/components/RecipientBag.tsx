import React from 'react';
import { XCircleIcon } from '@heroicons/react/outline';

type Props = { recipient: Identity; onRemoveHandler: Function };

const RecipientBag: React.FC<Props> = (props) => {
  const { recipient, onRemoveHandler } = props;
  return (
    <div
      className="
        rounded
        bg-red-200
        py-1
        px-2
        text-sm
        text-red-500
        flex
        flex-row
        items-center
        justify-center
        m-1
      "
    >
      <button type="button" onClick={() => onRemoveHandler(recipient)}>
        <XCircleIcon className="w-6 h-6 mr-2" />
      </button>
      <span className="font-semibold">@{recipient}</span>
    </div>
  );
};

export default RecipientBag;
