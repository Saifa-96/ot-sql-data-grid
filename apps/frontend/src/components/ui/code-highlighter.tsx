import { cn } from "@/lib/utils";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { JSX } from "react";
import { Fragment } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import type { BundledLanguage } from "shiki/bundle/web";
import { codeToHast } from "shiki/bundle/web";

export async function highlight(
  code: string,
  lang: BundledLanguage,
  options: React.HTMLAttributes<HTMLPreElement>
) {
  const { className, ...props } = options;

  // Handle Mermaid diagrams separately
  // if (lang === 'mermaid') {
  //   return (
  //     <div className={className}>
  //       <MermaidRenderer code={code} />
  //     </div>
  //   );
  // }

  const out = await codeToHast(code, {
    lang,
    theme: "github-dark",
  });

  return toJsxRuntime(out, {
    Fragment,
    jsx,
    jsxs,
    components: {
      pre: ({ className: preClassName, ...preProps }) => (
        <pre className={cn(preClassName, className)} {...props} {...preProps} />
      ),
      code: ({ className: codeClassName, ...codeProps }) => (
        <code
          className={cn("whitespace-pre-wrap", codeClassName)}
          {...codeProps}
        />
      ),
    },
    passNode: true,
  }) as JSX.Element;
}
