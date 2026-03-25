"use client";

import { useState } from "react";
import SelectField from "@/components/SelectField";
import {
  ADMIN_ROLE,
  BRANCH_MASTER_ROLE,
  INTEGRATED_MASTER_ROLE,
  ROLE_LABELS
} from "@/lib/roles";

export default function AdminUserRoleForm({
  action,
  intent,
  kakaoUserId,
  nickname = "",
  memo = "",
  initialRole = ADMIN_ROLE,
  initialBranchId = "",
  branches = [],
  availableRoles = [ADMIN_ROLE, BRANCH_MASTER_ROLE],
  fixedBranchId = "",
  fixedBranchName = "",
  submitLabel = "권한 저장"
}) {
  const [role, setRole] = useState(initialRole);
  const [branchId, setBranchId] = useState(initialBranchId ? String(initialBranchId) : "");
  const [error, setError] = useState("");
  const isIntegratedRole = role === INTEGRATED_MASTER_ROLE;
  const isFixedBranch = Boolean(fixedBranchId);
  const effectiveBranchId = isFixedBranch ? String(fixedBranchId) : branchId;

  function handleSubmit(event) {
    if (!isIntegratedRole && !effectiveBranchId) {
      event.preventDefault();
      setError("지점을 선택해야 합니다");
      return;
    }

    setError("");
  }

  return (
    <form action={action} method="post" onSubmit={handleSubmit}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="kakao_user_id" value={kakaoUserId} />
      <input type="hidden" name="nickname" value={nickname} />
      <input type="hidden" name="memo" value={memo} />
      {!isIntegratedRole ? (
        <input type="hidden" name="branch_id" value={effectiveBranchId} />
      ) : null}
      <div className="form-grid">
        <label className="field">
          <span className="field-label">권한</span>
          <SelectField
            name="role"
            value={role}
            onChange={(event) => {
              const nextRole = event.target.value;
              setRole(nextRole);
              if (nextRole === INTEGRATED_MASTER_ROLE) {
                setError("");
              }
            }}
          >
            {availableRoles.map((availableRole) => (
              <option key={availableRole} value={availableRole}>
                {ROLE_LABELS[availableRole]}
              </option>
            ))}
          </SelectField>
        </label>

        {isIntegratedRole ? (
          <label className="field">
            <span className="field-label">지점</span>
            <input value="통합 마스터는 지점이 필요 없습니다." disabled readOnly />
          </label>
        ) : isFixedBranch ? (
          <label className="field">
            <span className="field-label">지점</span>
            <input value={fixedBranchName} disabled readOnly />
          </label>
        ) : (
          <label className="field">
            <span className="field-label">지점</span>
            <SelectField
              value={branchId}
              onChange={(event) => {
                setBranchId(event.target.value);
                if (event.target.value) {
                  setError("");
                }
              }}
            >
              <option value="">선택</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </SelectField>
          </label>
        )}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions admin-form-actions">
        <button type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
