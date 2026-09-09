import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function DevlogBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose-devlog text-[15px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
