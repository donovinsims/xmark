import { Fragment, type ReactNode } from "react";

export function MarkdownView({ markdown }: { markdown: string }) {
  const blocks = splitBlocks(markdown);
  return (
    <div className="reader-body text-body text-text-primary">
      {blocks.map((block, i) => (
        <Fragment key={i}>{renderBlock(block)}</Fragment>
      ))}
    </div>
  );
}

function renderBlock(block: string): ReactNode {
  if (block === "---") return <hr />;
  if (block.startsWith("# ")) return <h1>{inline(block.slice(2))}</h1>;
  if (block.startsWith("## ")) return <h2>{inline(block.slice(3))}</h2>;
  if (block.startsWith("### ")) return <h3>{inline(block.slice(4))}</h3>;
  if (block.startsWith("```")) {
    const body = block.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
    return (
      <pre className="overflow-x-auto rounded-well bg-fill p-3 font-mono text-meta">
        {body}
      </pre>
    );
  }
  if (block.startsWith(">")) {
    const text = block
      .split("\n")
      .map((line) => line.replace(/^>\s?/, ""))
      .join("\n");
    return <blockquote>{inline(text)}</blockquote>;
  }
  if (/^[-*]\s/.test(block) || /^\d+\.\s/.test(block.split("\n")[0] ?? "")) {
    const items = block.split("\n").filter(Boolean);
    const ordered = /^\d+\.\s/.test(items[0] ?? "");
    const List = ordered ? "ol" : "ul";
    return (
      <List>
        {items.map((item, i) => (
          <li key={i}>{inline(item.replace(/^([-*]|\d+\.)\s+/, ""))}</li>
        ))}
      </List>
    );
  }
  const imageOnly = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (imageOnly) {
    return <img src={imageOnly[2]} alt={imageOnly[1] || "Image"} />;
  }
  return <p>{inline(block)}</p>;
}

function inline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re =
    /(!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]?.startsWith("![")) {
      parts.push(<img key={key++} src={match[3]} alt={match[2] || "Image"} />);
    } else if (match[4] != null) {
      parts.push(
        <a key={key++} href={match[5]} target="_blank" rel="noreferrer" className="link-blue">
          {match[4]}
        </a>,
      );
    } else if (match[6] != null) {
      parts.push(<strong key={key++}>{match[6]}</strong>);
    } else if (match[7] != null) {
      parts.push(<em key={key++}>{match[7]}</em>);
    } else if (match[8] != null) {
      parts.push(
        <code key={key++} className="font-mono text-meta">
          {match[8]}
        </code>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function splitBlocks(markdown: string): string[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let buf: string[] = [];
  let inCode = false;
  let inQuote = false;
  let inList = false;

  const flush = () => {
    if (buf.length) {
      blocks.push(buf.join("\n").trimEnd());
      buf = [];
    }
    inQuote = false;
    inList = false;
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        buf.push(line);
        flush();
        inCode = false;
      } else {
        flush();
        inCode = true;
        buf.push(line);
      }
      continue;
    }
    if (inCode) {
      buf.push(line);
      continue;
    }
    if (line.trim() === "---") {
      flush();
      blocks.push("---");
      continue;
    }
    if (line.startsWith(">")) {
      if (!inQuote) flush();
      inQuote = true;
      buf.push(line);
      continue;
    }
    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      if (!inList) flush();
      inList = true;
      buf.push(line);
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    if (inQuote || inList) flush();
    buf.push(line);
  }
  flush();
  return blocks.filter((b) => b.length);
}
