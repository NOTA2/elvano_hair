import ReadableText from "@/components/ReadableText";
import { TEMPLATE_VARIABLES } from "@/lib/templateVariables";

export default function TemplateVariableGuide({
  title = "사용 가능한 치환값",
  description = "한글 의미와 영문 치환값을 함께 표시합니다. 입력한 텍스트 안에 그대로 복사해서 사용하면 됩니다."
}) {
  return (
    <div className="variable-guide">
      <div className="variable-guide-head">
        <div className="panel-title" style={{ fontSize: 18 }}>{title}</div>
        <ReadableText className="panel-copy" style={{ margin: "6px 0 0" }}>
          {description}
        </ReadableText>
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
