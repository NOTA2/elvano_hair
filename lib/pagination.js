export function parsePage(searchParams, key = "page") {
  const value = searchParams?.[key];
  const parsed = Number(Array.isArray(value) ? value[0] : value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

export function parsePageSize(
  searchParams,
  key = "pageSize",
  allowed = [10, 20, 50, 100],
  fallback = 10
) {
  const value = searchParams?.[key];
  const parsed = Number(Array.isArray(value) ? value[0] : value);

  if (!Number.isFinite(parsed) || !allowed.includes(parsed)) {
    return fallback;
  }

  return parsed;
}

export function parseSort(searchParams, key = "sort", fallback = "") {
  const value = searchParams?.[key];

  if (Array.isArray(value)) {
    return value[0] || fallback;
  }

  return value || fallback;
}

export function parseDirection(searchParams, key = "direction", fallback = "desc") {
  const value = searchParams?.[key];
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved === "asc" ? "asc" : resolved === "desc" ? "desc" : fallback;
}

function compareValues(left, right) {
  if (left === right) {
    return 0;
  }

  if (left === null || left === undefined || left === "") {
    return 1;
  }

  if (right === null || right === undefined || right === "") {
    return -1;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  const leftDate = new Date(left).getTime();
  const rightDate = new Date(right).getTime();

  if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) {
    return leftDate - rightDate;
  }

  return String(left).localeCompare(String(right), "ko", {
    numeric: true,
    sensitivity: "base"
  });
}

export function sortItems(items, sortKey, direction = "desc", accessors = {}) {
  const accessor = accessors[sortKey];

  if (!accessor) {
    return [...items];
  }

  const sorted = [...items].sort((left, right) => compareValues(accessor(left), accessor(right)));
  return direction === "asc" ? sorted : sorted.reverse();
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
