import Link from "next/link";

const PAGE_WINDOW_SIZE = 5;

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

function resolveWindowRange(currentPage, totalPages) {
  const halfWindow = Math.floor(PAGE_WINDOW_SIZE / 2);
  let start = Math.max(1, currentPage - halfWindow);
  let end = start + PAGE_WINDOW_SIZE - 1;

  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - PAGE_WINDOW_SIZE + 1);
  }

  return { start, end };
}

function buildPages(currentPage, totalPages) {
  if (totalPages <= 0) {
    return [];
  }

  const items = [];
  const { start, end } = resolveWindowRange(currentPage, totalPages);

  if (start > 1) {
    items.push({ type: "page", page: 1 });

    if (start > 2) {
      items.push({ type: "gap", key: `start-gap-${start}` });
    }
  }

  for (let page = start; page <= end; page += 1) {
    items.push({ type: "page", page });
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      items.push({ type: "gap", key: `end-gap-${end}` });
    }

    items.push({ type: "page", page: totalPages });
  }

  return items;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  pageParam = "page",
  searchParams
}) {
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
        {pages.map((item) =>
          item.type === "gap" ? (
            <span key={item.key} className="pagination-gap" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          ) : (
            <Link
              key={item.page}
              href={hrefFor(item.page)}
              className={`pagination-link ${item.page === currentPage ? "active" : ""}`}
              aria-current={item.page === currentPage ? "page" : undefined}
            >
              {item.page}
            </Link>
          )
        )}
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
