import { headers } from "next/headers";
import {
  getRouteSession,
  isBranchMaster,
  isIntegratedMaster
} from "@/lib/auth";
import { getBaseUrl } from "@/lib/config";
import {
  createBranch,
  deleteBranch,
  getBranchById,
  updateBranch
} from "@/lib/db";

const PHONE_PATTERN = /^0\d{1,2}-\d{3,4}-\d{4}$/;

function redirectBack(headerStore, params = {}) {
  const url = new URL(headerStore.get("referer") || "/admin/branches", getBaseUrl());

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      url.searchParams.delete(key);
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return Response.redirect(url, 302);
}

function normalizeString(formData, name) {
  const value = formData.get(name);
  return value === null ? "" : String(value).trim();
}

function validatePhone(phone) {
  if (!phone) {
    return "phone_required";
  }

  if (!PHONE_PATTERN.test(phone)) {
    return "phone_invalid";
  }

  return "";
}

export async function POST(request) {
  const session = await getRouteSession();

  if (!session || (!isIntegratedMaster(session) && !isBranchMaster(session))) {
    return Response.redirect(`${getBaseUrl()}/admin/login`, 302);
  }

  const headerStore = await headers();
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    if (!isIntegratedMaster(session)) {
      return redirectBack(headerStore);
    }

    const phone = normalizeString(formData, "phone");
    const phoneError = validatePhone(phone);

    if (phoneError) {
      return redirectBack(headerStore, { error: phoneError });
    }

    await createBranch({
      name: formData.get("name"),
      phone,
      description: formData.get("description"),
      is_active: formData.get("is_active") === "1"
    });

    return redirectBack(headerStore, { error: "", message: "" });
  }

  if (intent === "update") {
    const branchId = Number(formData.get("id"));
    const branch = await getBranchById(branchId);

    if (!branch) {
      return redirectBack(headerStore);
    }

    if (isBranchMaster(session) && Number(session.branch_id) !== branchId) {
      return redirectBack(headerStore);
    }

    const phone = normalizeString(formData, "phone");
    const phoneError = validatePhone(phone);

    if (phoneError) {
      return redirectBack(headerStore, { error: phoneError });
    }

    await updateBranch(branchId, {
      name: formData.get("name"),
      phone,
      description: formData.get("description"),
      is_active: formData.get("is_active") === "1"
    });

    return redirectBack(headerStore, { error: "", message: "" });
  }

  if (intent === "delete") {
    if (!isIntegratedMaster(session)) {
      return redirectBack(headerStore);
    }

    await deleteBranch(Number(formData.get("id")));

    return redirectBack(headerStore, { error: "", message: "" });
  }

  return redirectBack(headerStore);
}
