export default function AdminDocumentIssueFormPlaceholder() {
  return (
    <div className="modal-loading-shell" aria-hidden="true">
      <div className="modal-loading-grid">
        <span className="loading-skeleton loading-skeleton-title short" />
        <span className="loading-skeleton loading-skeleton-copy" />
        <span className="loading-skeleton loading-skeleton-title short" />
        <span className="loading-skeleton loading-skeleton-copy" />
        <span className="loading-skeleton loading-skeleton-copy" />
        <div className="modal-loading-editor">
          <span className="loading-skeleton loading-skeleton-copy" />
          <span className="loading-skeleton loading-skeleton-copy" />
          <span className="loading-skeleton loading-skeleton-copy" />
          <span className="loading-skeleton loading-skeleton-copy" />
        </div>
      </div>
      <div className="modal-loading-actions">
        <span className="loading-skeleton loading-skeleton-pill" />
        <span className="loading-skeleton loading-skeleton-pill" />
      </div>
      <span className="sr-only">문서 발급 폼을 불러오는 중입니다.</span>
    </div>
  );
}
