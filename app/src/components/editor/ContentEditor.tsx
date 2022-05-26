import React, { useMemo, useCallback, useState, forwardRef } from 'react';
import isHotkey from 'is-hotkey';
import imageExtensions from 'image-extensions';
import isUrl from 'is-url';
import { BaseEditor, Descendant, createEditor, Transforms, Editor } from 'slate';
import { ReactEditor, withReact, Slate, Editable } from 'slate-react';
import { toggleMark } from './utils';

type CustomElement = { type: string; children: CustomText[] };
type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  align?: string;
};

type EmptyText = {
  text: string;
};

type ImageElement = {
  type: 'image';
  url: string;
  children: EmptyText[];
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

const EMPTY_VALUE = [
  {
    children: [{ text: '' }],
  },
];

import Menu from './Menu';

const HOTKEYS: Record<string, string> = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
};

import { Element as ImageElement } from './elements/image';

const Element = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align };
  switch (element.type) {
    case 'block-quote':
      return (
        <blockquote
          className="border-l-2 p-2 my-2 font-bold border-gray-400 dark:border-gray-200 text-gray-600 dark:text-gray-300"
          style={style}
          {...attributes}
        >
          {children}
        </blockquote>
      );
    case 'bulleted-list':
      return (
        <ul className="list-disc pl-4" style={style} {...attributes}>
          {children}
        </ul>
      );
    case 'heading-one':
      return (
        <h1 className="text-3xl my-4" style={style} {...attributes}>
          {children}
        </h1>
      );
    case 'heading-two':
      return (
        <h2 className="text-2xl my-4" style={style} {...attributes}>
          {children}
        </h2>
      );
    case 'list-item':
      return (
        <li style={style} {...attributes}>
          {children}
        </li>
      );
    case 'numbered-list':
      return (
        <ol className="list-decimal pl-4" style={style} {...attributes}>
          {children}
        </ol>
      );

    case 'image':
      return <ImageElement {...attributes} />;

    default:
      return (
        <p style={style} {...attributes}>
          {children}
        </p>
      );
  }
};

const Leaf = ({ attributes, children, leaf }: any) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};

const insertImage = (editor: Editor, url: string) => {
  const text = { text: '' };
  const image: ImageElement = { type: 'image', url, children: [text] };
  Transforms.insertNodes(editor, image);
};

const isImageUrl = (url: string) => {
  if (!url) return false;
  if (!isUrl(url)) return false;
  const ext = new URL(url).pathname.split('.').pop();
  if (!ext) {
    return false;
  }
  return imageExtensions.includes(ext);
};

const withImages = (editor: Editor) => {
  const { insertData, isVoid } = editor;

  editor.isVoid = (element) => {
    return element.type === 'image' ? true : isVoid(element);
  };

  editor.insertData = (data) => {
    const text = data.getData('text/plain');
    const { files } = data;

    if (files && files.length > 0) {
      for (const file of files) {
        const reader = new FileReader();
        const [mime] = file.type.split('/');

        if (mime === 'image') {
          reader.addEventListener('load', () => {
            const url = reader.result;
            insertImage(editor, url as any);
          });

          reader.readAsDataURL(file);
        }
      }
    } else if (isImageUrl(text)) {
      insertImage(editor, text);
    } else {
      insertData(data);
    }
  };

  return editor;
};

type PropsType = {
  className?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  value: any;
  onChange?: Function;
};

const ContentEditor = forwardRef<Element, PropsType>((props, ref) => {
  const { className, disabled = false, onChange, placeholder = '', value = EMPTY_VALUE } = props;
  const editor = useMemo(() => withImages(withReact(createEditor())), []);

  let valueToShow = value;
  if (Array.isArray(value) && !value.length) {
    valueToShow = EMPTY_VALUE;
  } else if (typeof value === 'string') {
    valueToShow = [
      {
        type: 'paragraph',
        text: value,
      },
    ];
  }

  const renderElement = useCallback((props: any) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);

  const onKeyDownHandler = (event: React.KeyboardEvent<HTMLElement>) => {
    for (const hotkey in HOTKEYS) {
      if (isHotkey(hotkey, event)) {
        if (event) {
          event.preventDefault();
        }
        const mark = HOTKEYS[hotkey];
        toggleMark(editor, mark);
      }
    }
  };

  const onChangeHandler = (value: any) => {
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <div className={`${className} flex flex-col`}>
      <Slate editor={editor} value={valueToShow} onChange={onChangeHandler}>
        <Menu />
        <Editable
          className="p-2 flex-1"
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder={placeholder}
          spellCheck
          readOnly={disabled}
          autoFocus
          onKeyDown={onKeyDownHandler}
        />
      </Slate>
    </div>
  );
});

export default ContentEditor;
