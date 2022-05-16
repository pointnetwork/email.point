import React, { memo } from 'react';

const IdentitToComposeViewButton: React.FC<{ identity: Identity; className?: string }> = (
  props
) => {
  const { identity, className = '' } = props;

  function sendToSender(event: React.MouseEvent<HTMLElement>) {
    event.stopPropagation();
    window.location.href = `/compose?to=${identity}`;
  }

  return (
    <button
      onClick={sendToSender}
      className={`cursor-pointer hover:underline hover:font-semibold ${className}`}
    >
      @{identity}
    </button>
  );
};

export default memo(IdentitToComposeViewButton);
