"use client";

import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  loading: () => <div className="editor-loading-placeholder" aria-hidden="true" />
});

export default function LazyRichTextEditor(props) {
  return <RichTextEditor {...props} />;
}
