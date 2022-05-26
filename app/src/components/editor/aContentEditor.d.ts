import { BaseEditor } from 'slate';
import { ReactEditor } from 'slate-react';

type CustomElement = { type: string; children: CustomText[] };
type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  align?: string;
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

interface BaseProps {
  className: string;
  [key: string]: unknown;
}

type OrNull<T> = T | null;
