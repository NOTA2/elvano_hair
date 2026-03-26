"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startGlobalLoading } from "@/components/GlobalLoadingOverlay";
import SelectField from "@/components/SelectField";

export default function DashboardPeriodControls({
  currentPeriod = "6m",
  options = [],
  periodParam = "period",
  currentBranchId = "",
  branchParam = "",
  branchOptions = [],
  branchDisabled = false,
  includeAllBranchesOption = false
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(nextValues) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(nextValues).forEach(([key, value]) => {
      if (!key) {
        return;
      }

      if (value === undefined || value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

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
        <span>기간</span>
        <SelectField
          value={currentPeriod}
          onChange={(event) => {
            updateParams({ [periodParam]: event.target.value });
          }}
          wrapperClassName="list-query-select"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </label>

      {branchParam ? (
        <label className="list-query-field">
          <span>지점</span>
          <SelectField
            value={String(currentBranchId || "")}
            onChange={(event) => {
              updateParams({ [branchParam]: event.target.value });
            }}
            wrapperClassName="list-query-select"
            disabled={branchDisabled}
            placeholder="전체 지점"
          >
            {includeAllBranchesOption ? <option value="">전체 지점</option> : null}
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </SelectField>
        </label>
      ) : null}
    </div>
  );
}
