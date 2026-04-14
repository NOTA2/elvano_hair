export default function ActionTooltip({ label, children }) {
  return (
    <div className="table-action-tooltip compact-action-tooltip" data-tooltip={label} title={label}>
      {children}
    </div>
  );
}
