export default function AdminSectionIntro({
  eyebrow,
  title,
  description,
  actions = null
}) {
  return (
    <section className="panel section-intro-panel">
      <div className="panel-head">
        <div>
          {eyebrow ? <div className="panel-eyebrow">{eyebrow}</div> : null}
          <h2 className="panel-title">{title}</h2>
          {description ? <p className="panel-copy">{description}</p> : null}
        </div>
        {actions ? <div className="panel-actions">{actions}</div> : null}
      </div>
    </section>
  );
}
