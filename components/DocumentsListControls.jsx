"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startGlobalLoading } from "@/components/GlobalLoadingOverlay";
import SelectField from "@/components/SelectField";

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

export default function DocumentsListControls({
  pageParam = "page",
  pageSizeParam = "pageSize",
  sortParam = "sort",
  directionParam = "direction",
  branchParam = "branchId",
  currentPageSize = 10,
  currentSort = "",
  currentDirection = "desc",
  currentBranchId = "",
  sortOptions = [],
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  branchOptions = [],
  branchDisabled = false
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(nextValues) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(nextValues).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    params.delete(pageParam);
    const query = params.toString();

    if (query === searchParams.toString()) {
      return;
    }

    startGlobalLoading();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="list-query-controls">
      <label className="list-query-field">
        <span>지점</span>
        <SelectField
          value={String(currentBranchId || "")}
          onChange={(event) => {
            updateParams({ [branchParam]: event.target.value });
          }}
          wrapperClassName="list-query-select"
          disabled={branchDisabled}
        >
          <option value="">전체</option>
          {branchOptions.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </SelectField>
      </label>

      <label className="list-query-field">
        <span>표시 개수</span>
        <SelectField
          value={String(currentPageSize)}
          onChange={(event) => {
            updateParams({ [pageSizeParam]: event.target.value });
          }}
          wrapperClassName="list-query-select"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}개
            </option>
          ))}
        </SelectField>
      </label>

      {sortOptions.length > 0 ? (
        <>
          <label className="list-query-field">
            <span>정렬 기준</span>
            <SelectField
              value={currentSort}
              onChange={(event) => {
                updateParams({ [sortParam]: event.target.value });
              }}
              wrapperClassName="list-query-select"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </label>

          <label className="list-query-field">
            <span>정렬 방향</span>
            <SelectField
              value={currentDirection}
              onChange={(event) => {
                updateParams({ [directionParam]: event.target.value });
              }}
              wrapperClassName="list-query-select"
            >
              <option value="asc">오름차순</option>
              <option value="desc">내림차순</option>
            </SelectField>
          </label>
        </>
      ) : null}
    </div>
  );
}
