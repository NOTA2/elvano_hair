import { headers } from "next/headers";
import {
  canManageBranchSettings,
  getRouteSession
} from "@/lib/auth";
import { getBizgoNotificationTemplate, mapBizgoTemplateToLocal } from "@/lib/bizgo";
import { getBaseUrl, getBizgoSenderKey } from "@/lib/config";
import {
  createNotificationTemplate,
  deleteNotificationTemplate,
  getNotificationTemplateByCode,
  getNotificationTemplateById,
  updateNotificationTemplate
} from "@/lib/db";

const ERROR_CODES = {
  sender_key_missing: "sender_key_missing",
  template_code_required: "template_code_required",
  template_lookup_failed: "template_lookup_failed",
  duplicate_template_code: "duplicate_template_code"
};

function redirectBack(headerStore, params = {}) {
  const referer = headerStore.get("referer");
  const url = new URL(referer || "/admin/notification-templates", getBaseUrl());

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
  return value === null ? null : String(value).trim();
}

function buildLocalInput({ branchId, templateCode, currentTemplate = null }) {
  return {
    branch_id: branchId || null,
    template_code: templateCode,
    status: currentTemplate?.status === "inactive" ? "inactive" : "active"
  };
}

async function fetchRemoteTemplate(templateCode) {
  try {
    getBizgoSenderKey();
  } catch {
    return { error: ERROR_CODES.sender_key_missing };
  }

  try {
    const remoteTemplate = await getBizgoNotificationTemplate({ templateCode });

    if (!remoteTemplate) {
      return { error: ERROR_CODES.template_lookup_failed };
    }

    return { remoteTemplate };
  } catch {
    return { error: ERROR_CODES.template_lookup_failed };
  }
}

export async function POST(request) {
  const session = await getRouteSession();

  if (!session || !canManageBranchSettings(session)) {
    return Response.redirect(`${getBaseUrl()}/admin/login`, 302);
  }

  const headerStore = await headers();
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "create") {
    const templateCode = normalizeString(formData, "template_code");

    if (!templateCode) {
      return redirectBack(headerStore, { error: ERROR_CODES.template_code_required });
    }

    const duplicate = await getNotificationTemplateByCode(templateCode);

    if (duplicate && duplicate.status !== "deleted") {
      return redirectBack(headerStore, { error: ERROR_CODES.duplicate_template_code });
    }

    const { remoteTemplate, error } = await fetchRemoteTemplate(templateCode);

    if (error) {
      return redirectBack(headerStore, { error });
    }

    if (duplicate && duplicate.status === "deleted") {
      await updateNotificationTemplate(duplicate.id, {
        ...buildLocalInput({ branchId: null, templateCode }),
        ...mapBizgoTemplateToLocal(remoteTemplate)
      });
    } else {
      await createNotificationTemplate({
        ...buildLocalInput({ branchId: null, templateCode }),
        ...mapBizgoTemplateToLocal(remoteTemplate)
      });
    }

    return redirectBack(headerStore, { error: "" });
  }

  const templateId = Number(formData.get("id"));
  const currentTemplate = await getNotificationTemplateById(templateId);

  if (!currentTemplate) {
    return redirectBack(headerStore);
  }

  if (intent === "update") {
    const templateCode = normalizeString(formData, "template_code");

    if (!templateCode) {
      return redirectBack(headerStore, { error: ERROR_CODES.template_code_required });
    }

    const duplicate = await getNotificationTemplateByCode(templateCode);

    if (duplicate && Number(duplicate.id) !== Number(templateId) && duplicate.status !== "deleted") {
      return redirectBack(headerStore, { error: ERROR_CODES.duplicate_template_code });
    }

    const { remoteTemplate, error } = await fetchRemoteTemplate(templateCode);

    if (error) {
      return redirectBack(headerStore, { error });
    }

    await updateNotificationTemplate(templateId, {
      ...buildLocalInput({ branchId: null, templateCode, currentTemplate }),
      ...mapBizgoTemplateToLocal(remoteTemplate)
    });

    return redirectBack(headerStore, { error: "" });
  }

  if (intent === "sync") {
    const { remoteTemplate, error } = await fetchRemoteTemplate(currentTemplate.template_code);

    if (error) {
      return redirectBack(headerStore, { error });
    }

    await updateNotificationTemplate(templateId, {
      branch_id: null,
      status: currentTemplate.status,
      ...mapBizgoTemplateToLocal(remoteTemplate)
    });

    return redirectBack(headerStore, { error: "" });
  }

  if (intent === "delete") {
    await deleteNotificationTemplate(templateId);
  }

  return redirectBack(headerStore, { error: "" });
}
