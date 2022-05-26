import React from 'react';

import { MenuButton as ImageMenuButton } from './elements/image';

import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import CodeIcon from '@mui/icons-material/Code';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ImageIcon from '@mui/icons-material/Image';

import MarkButton from './MarkButton';
import BlockButton from './BlockButton';

const Menu: React.FC<{}> = () => {
  return (
    <div className="border-b-2 w-full flex flex-row space-beetween">
      <MarkButton format="bold">
        <FormatBoldIcon />
      </MarkButton>
      <MarkButton format="italic">
        <FormatItalicIcon />
      </MarkButton>
      <MarkButton format="underline">
        <FormatUnderlinedIcon />
      </MarkButton>
      <MarkButton format="code">
        <CodeIcon />
      </MarkButton>
      <BlockButton format="heading-one">
        <LooksOneIcon />
      </BlockButton>
      <BlockButton format="heading-two">
        <LooksTwoIcon />
      </BlockButton>
      <BlockButton format="block-quote">
        <FormatQuoteIcon />
      </BlockButton>
      <BlockButton format="numbered-list">
        <FormatListNumberedIcon />
      </BlockButton>
      <BlockButton format="bulleted-list">
        <FormatListBulletedIcon />
      </BlockButton>
      <BlockButton format="left">
        <FormatAlignLeftIcon />
      </BlockButton>
      <BlockButton format="center">
        <FormatAlignCenterIcon />
      </BlockButton>
      <BlockButton format="right">
        <FormatAlignRightIcon />
      </BlockButton>
      <BlockButton format="justify">
        <FormatAlignJustifyIcon />
      </BlockButton>
      <ImageMenuButton />
    </div>
  );
};

export default Menu;
