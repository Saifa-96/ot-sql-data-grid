import { FC } from "react";

interface ContentBlockProps {
  reasonContent: string;
  content: string;

}

const ContentBlock: FC<ContentBlockProps> = ({ reasonContent, content }) => {
  const paragraphs = splitToParagraphs(reasonContent);

  if (content !== "") {
    return (
      <div>
        <Dots paragraphs={paragraphs} />
        <pre>{content.trim()}</pre>
      </div>
    );
  }

  const [lastItem] = paragraphs.slice(-1);
  return (
    <div>
      <Dots paragraphs={paragraphs} />
      <p>{lastItem}</p>
    </div>
  );
};

const Dots: FC<{ paragraphs: string[] }> = ({ paragraphs }) => {
  return (
    <div className="flex space-x-2 mb-2">
      {paragraphs.map((i) => (
        <div key={i} className="h-2 w-2 rounded-full bg-gray-500 shadow-md" />
      ))}
    </div>
  );
};

const splitToParagraphs = (text: string) =>
  text
    .split("\n\n")
    .filter((i) => i !== "")
    .map((p) => p.trim());

export default ContentBlock;
