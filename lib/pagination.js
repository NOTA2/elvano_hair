export function parsePage(searchParams, key = "page") {
  const value = searchParams?.[key];
  const parsed = Number(Array.isArray(value) ? value[0] : value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

export function paginateItems(items, currentPage, perPage = 10) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * perPage;

  return {
    items: items.slice(startIndex, startIndex + perPage),
    currentPage: safePage,
    totalPages,
    totalItems,
    perPage
  };
}
