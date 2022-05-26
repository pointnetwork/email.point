import React, { PropsWithChildren, Ref } from 'react';

interface BaseProps {
  className: string;
  [key: string]: unknown;
}

type OrNull<T> = T | null;

const Button = React.forwardRef(
  (
    {
      className,
      active,
      reversed,
      ...props
    }: PropsWithChildren<
      {
        active: boolean;
        reversed: boolean;
      } & BaseProps
    >,
    ref: Ref<OrNull<HTMLSpanElement>>
  ) => (
    <span
      {...props}
      ref={ref as any}
      className={`
        ${className}
        cursor-pointer
        p-2
        hover:bg-gray-100
        dark:hover:bg-gray-800
        ${active ? 'bg-gray-100 dark:bg-gray-800' : ''}
      `}
    />
  )
);

export default Button;
