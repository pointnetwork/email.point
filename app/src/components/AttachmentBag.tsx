import React, { memo } from 'react';
import { XCircleIcon } from '@heroicons/react/outline';

const AttachmentBag: React.FC<{ attachment: File; onRemoveHandler: Function }> = (props) => {
  const { attachment, onRemoveHandler } = props;
  return (
    <div
      className="
        rounded
        bg-gray-200
        py-2
        px-4
        text-gray-500
        flex
        flex-row
        items-center
        justify-center
        m-1
      "
    >
      <button type="button" onClick={() => onRemoveHandler(attachment)}>
        <XCircleIcon className="w-6 h-6 mr-2" />
      </button>
      <span className="font-semibold">{attachment.name}</span>
    </div>
  );
};

export default memo(AttachmentBag);
