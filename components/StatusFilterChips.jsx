import Link from "next/link";

export const LIFECYCLE_STATUS_OPTIONS = [
  { value: "active", label: "사용" },
  { value: "inactive", label: "중지" },
  { value: "deleted", label: "삭제" }
];

export const ACTIVE_STATUS_OPTIONS = LIFECYCLE_STATUS_OPTIONS.filter(
  (option) => option.value !== "deleted"
);

function normalizeStatusValues(values, options) {
  const allowedValues = new Set(options.map((option) => option.value));
  return [...new Set(values)].filter((value) => allowedValues.has(value));
}

export function parseStatusFilters({
  searchParams,
  param = "status",
  options = LIFECYCLE_STATUS_OPTIONS,
  defaultStatuses = ["active"]
} = {}) {
  const value = searchParams?.[param];
  const rawValues = (Array.isArray(value) ? value : value ? [value] : []).flatMap((item) =>
    String(item).split(",")
  );
  const filters = normalizeStatusValues(rawValues, options);
  return filters.length > 0 ? filters : defaultStatuses;
}

function buildQueryString(searchParams) {
  const params = new URLSearchParams();

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          params.append(key, String(item));
        }
      });
      return;
    }

    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  return params;
}

function sameStatuses(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function buildStatusFilterHref({
  pathname,
  searchParams,
  selectedStatuses,
  status,
  param,
  options,
  defaultStatuses,
  pageParam
}) {
  const isSelected = selectedStatuses.includes(status);
  let nextStatuses = isSelected
    ? selectedStatuses.filter((item) => item !== status)
    : [...selectedStatuses, status];

  if (nextStatuses.length === 0) {
    nextStatuses = defaultStatuses;
  }

  nextStatuses = normalizeStatusValues(nextStatuses, options);

  const params = buildQueryString(searchParams);
  params.delete(pageParam);

  if (sameStatuses(nextStatuses, defaultStatuses)) {
    params.delete(param);
  } else {
    params.set(param, nextStatuses.join(","));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function statusCount(status, counts) {
  return counts[status] || 0;
}

function visibleCount(selectedStatuses, counts) {
  return selectedStatuses.reduce((total, status) => total + statusCount(status, counts), 0);
}

function statusClassName(selectedStatuses, status) {
  return `metric-pill status-filter-chip ${
    selectedStatuses.includes(status) ? "active" : ""
  }`.trim();
}

export default function StatusFilterChips({
  pathname,
  searchParams,
  selectedStatuses,
  counts,
  options = LIFECYCLE_STATUS_OPTIONS,
  param = "status",
  pageParam = "page",
  defaultStatuses = ["active"],
  summaryLabel = "표시"
}) {
  return (
    <div className="panel-kpi-row">
      <span className="metric-pill">{summaryLabel} {visibleCount(selectedStatuses, counts)}</span>
      {options.map((option) => (
        <Link
          key={option.value}
          href={buildStatusFilterHref({
            pathname,
            searchParams,
            selectedStatuses,
            status: option.value,
            param,
            options,
            defaultStatuses,
            pageParam
          })}
          className={statusClassName(selectedStatuses, option.value)}
          role="button"
          aria-pressed={selectedStatuses.includes(option.value)}
        >
          {option.label} {statusCount(option.value, counts)}
        </Link>
      ))}
    </div>
  );
}
