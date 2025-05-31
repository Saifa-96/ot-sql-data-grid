'use client';

import { type JSX, useLayoutEffect, useState } from 'react';
import type { BundledLanguage } from 'shiki/bundle/web';
import { highlight } from './code-highlighter';

interface HighlightedCodeProps extends React.HTMLAttributes<HTMLPreElement> {
  language: BundledLanguage;
  initial?: JSX.Element;
  code: string;
}

export function HighlightedCode({
  initial,
  children,
  className,
  language,
  code,
  ...props
}: HighlightedCodeProps) {
  const [nodes, setNodes] = useState(initial);

  useLayoutEffect(() => {
    void highlight(code, language, { className, ...props }).then(setNodes);
  }, [className, code, language, props]);

  if (!nodes) {
    return (
      <pre className={className} {...props}>
        <code className="whitespace-pre-wrap">{code}</code>
      </pre>
    );
  }

  return nodes;
}