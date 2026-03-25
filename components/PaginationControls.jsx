import Link from "next/link";

function normalizeSearchParams(searchParams) {
  const params = new URLSearchParams();

  if (!searchParams) {
    return params;
  }

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined) {
          params.append(key, String(item));
        }
      });
      return;
    }

    if (value !== undefined) {
      params.set(key, String(value));
    }
  });

  return params;
}

function buildPages(currentPage, totalPages) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export default function PaginationControls({
  currentPage,
  totalPages,
  pageParam = "page",
  searchParams
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = buildPages(currentPage, totalPages);

  function hrefFor(page) {
    const params = normalizeSearchParams(searchParams);

    if (page <= 1) {
      params.delete(pageParam);
    } else {
      params.set(pageParam, String(page));
    }

    const query = params.toString();
    return query ? `?${query}` : "?";
  }

  return (
    <div className="pagination-bar">
      <Link
        href={hrefFor(Math.max(1, currentPage - 1))}
        className={`pagination-link ${currentPage === 1 ? "disabled" : ""}`}
        aria-disabled={currentPage === 1}
        tabIndex={currentPage === 1 ? -1 : undefined}
      >
        이전
      </Link>

      <div className="pagination-pages">
        {pages.map((page) => (
          <Link
            key={page}
            href={hrefFor(page)}
            className={`pagination-link ${page === currentPage ? "active" : ""}`}
          >
            {page}
          </Link>
        ))}
      </div>

      <Link
        href={hrefFor(Math.min(totalPages, currentPage + 1))}
        className={`pagination-link ${currentPage === totalPages ? "disabled" : ""}`}
        aria-disabled={currentPage === totalPages}
        tabIndex={currentPage === totalPages ? -1 : undefined}
      >
        다음
      </Link>
    </div>
  );
}
