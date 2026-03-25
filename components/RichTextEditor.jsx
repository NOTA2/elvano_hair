"use client";

import { useEffect, useMemo, useState } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { normalizeTemplateContent } from "@/lib/templateContent";

export default function RichTextEditor({
  name,
  defaultValue = "",
  placeholder = "내용을 입력하세요."
}) {
  const initialContent = useMemo(
    () => normalizeTemplateContent(defaultValue),
    [defaultValue]
  );
  const [html, setHtml] = useState(initialContent);

  useEffect(() => {
    setHtml(initialContent);
  }, [initialContent]);

  return (
    <div className="rich-text-field">
      <input type="hidden" name={name} value={html} />
      <SimpleEditor
        content={initialContent}
        placeholder={placeholder}
        onChange={(nextHtml) => {
          setHtml(normalizeTemplateContent(nextHtml));
        }}
      />
    </div>
  );
}
