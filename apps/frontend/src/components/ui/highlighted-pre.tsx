import { cn } from "@/lib/utils";
import { isValidElement, memo, useEffect, useState } from "react";
import { codeToTokens, bundledLanguages, ThemedToken } from "shiki";

const DEFAULT_PRE_BLOCK_CLASS =
  "my-4 overflow-x-auto w-fit rounded-xl bg-zinc-950 text-zinc-50 dark:bg-zinc-900 border border-border p-4";
const extractTextContent = (node: React.ReactNode): string => {
  if (typeof node === "string") {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map(extractTextContent).join("");
  }
  if (isValidElement(node)) {
    return extractTextContent(node.props.children);
  }
  return "";
};

interface HighlightedPreProps extends React.HTMLAttributes<HTMLPreElement> {
  language: string;
}

const HighlightedPre = memo(
  ({ children, className, language, ...props }: HighlightedPreProps) => {
    const code = extractTextContent(children);
    const [tokens, setTokens] = useState<ThemedToken[][]>([]);

    useEffect(() => {
      const getTokens = async () => {
        const { tokens } = await codeToTokens(code, {
          lang: language as keyof typeof bundledLanguages,
          themes: {
            light: "github-dark",
            dark: "github-dark",
          },
        });

        setTokens(tokens);
      };
      getTokens();
    }, [code, language]);

    if (!(language in bundledLanguages)) {
      return (
        <pre {...props} className={cn(DEFAULT_PRE_BLOCK_CLASS, className)}>
          <code className="whitespace-pre-wrap">{children}</code>
        </pre>
      );
    }
    if (tokens.length === 0) return null;
    return (
      <pre {...props} className={cn(DEFAULT_PRE_BLOCK_CLASS, className)}>
        <code className="whitespace-pre-wrap">
          {tokens.map((line, lineIndex) => (
            <span
              key={`line-${
                // biome-ignore lint/suspicious/noArrayIndexKey: Needed for react key
                lineIndex
              }`}
            >
              {line.map((token, tokenIndex) => {
                const style =
                  typeof token.htmlStyle === "string"
                    ? undefined
                    : token.htmlStyle;

                return (
                  <span
                    key={`token-${
                      // biome-ignore lint/suspicious/noArrayIndexKey: Needed for react key
                      tokenIndex
                    }`}
                    style={style}
                  >
                    {token.content}
                  </span>
                );
              })}
              {lineIndex !== tokens.length - 1 && "\n"}
            </span>
          ))}
        </code>
      </pre>
    );
  }
);

export default HighlightedPre;

HighlightedPre.displayName = "HighlightedPre";
