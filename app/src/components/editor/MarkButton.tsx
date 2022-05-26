import React, { ReactElement } from 'react';
import { useSlate } from 'slate-react';

import Button from './Button';
import { isMarkActive, toggleMark } from './utils';

const MarkButton: React.FC<{ format: string; children: ReactElement }> = ({ format, children }) => {
  const editor = useSlate();
  return (
    <Button
      active={isMarkActive(editor, format)}
      onMouseDown={(event: React.MouseEvent) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      {children}
    </Button>
  );
};

export default MarkButton;
