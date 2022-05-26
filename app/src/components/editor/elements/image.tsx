import React, { ReactElement } from 'react';
import {
  ReactEditor,
  withReact,
  Slate,
  Editable,
  useFocused,
  useSelected,
  useSlateStatic,
} from 'slate-react';
import { BaseEditor, Descendant, createEditor, Transforms, Editor } from 'slate';

import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';

import Button from '../Button';

export const type = 'image';

export const MenuButton: React.FC<{}> = () => {
  const editor = useSlateStatic();
  return (
    <Button
      onMouseDown={(event: React.MouseEvent) => {
        event.preventDefault();
        const url = window.prompt('Enter the URL of the image:');
        /*
        if (url && !isImageUrl(url)) {
          alert('URL is not an image');
          return;
        }
        insertImage(editor, url);
        */
      }}
    >
      <ImageIcon />
    </Button>
  );
};

export const Element: React.FC<{}> = ({ attributes, children, element }: any) => {
  const editor = useSlateStatic();
  const path = ReactEditor.findPath(editor, element);

  const selected = useSelected();
  const focused = useFocused();
  return (
    <div {...attributes}>
      {children}
      <div contentEditable={false} className="relative">
        <img
          src={element.url}
          className={`
              display: block;
              max-width: 100%;
              max-height: 20em;
              box-shadow: ${selected && focused ? '0 0 0 3px #B4D5FF' : 'none'};
            `}
        />
        <button
          onClick={() => Transforms.removeNodes(editor, { at: path })}
          className={`
            display: ${selected && focused ? 'inline' : 'none'};
            position: absolute;
            top: 0.5em;
            left: 0.5em;
            background-color: white;
          `}
        >
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
};
