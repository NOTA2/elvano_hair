"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startGlobalLoading } from "@/components/GlobalLoadingOverlay";

export default function DocumentsSearchControls({
  pageParam = "page",
  searchParam = "keyword",
  currentSearchTerm = ""
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchKeyword, setSearchKeyword] = useState(String(currentSearchTerm || ""));

  useEffect(() => {
    setSearchKeyword(String(currentSearchTerm || ""));
  }, [currentSearchTerm]);

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
    <div className="documents-search-controls">
      <form
        className="documents-search-form"
        onSubmit={(event) => {
          event.preventDefault();
          updateParams({ [searchParam]: searchKeyword.trim() });
        }}
      >
        <label className="list-query-field documents-search-field">
          <input
            type="search"
            value={searchKeyword}
            onChange={(event) => {
              setSearchKeyword(event.target.value);
            }}
            className="list-query-input"
            placeholder="고객명 전체 또는 전화번호 전체/뒷자리 4자리"
          />
        </label>
        <div className="list-query-inline-actions">
          <button type="submit" className="secondary">
            검색
          </button>
          {currentSearchTerm ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSearchKeyword("");
                updateParams({ [searchParam]: "" });
              }}
            >
              초기화
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
