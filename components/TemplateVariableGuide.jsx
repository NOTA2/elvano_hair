import ReadableText from "@/components/ReadableText";
import { TEMPLATE_VARIABLES } from "@/lib/templateVariables";

export default function TemplateVariableGuide({
  title = "사용 가능한 치환값",
  description = ""
}) {
  return (
    <div className="variable-guide">
      <div className="variable-guide-head">
        <div className="panel-title" style={{ fontSize: 18 }}>{title}</div>
        {description ? (
          <ReadableText className="panel-copy" style={{ margin: "6px 0 0" }}>
            {description}
          </ReadableText>
        ) : null}
      </div>
      <div className="variable-guide-grid">
        {TEMPLATE_VARIABLES.map((item) => (
          <div key={item.key} className="variable-guide-row">
            <span className="variable-guide-label">{item.label}</span>
            <code className="variable-guide-code">{`{{${item.key}}}`}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
