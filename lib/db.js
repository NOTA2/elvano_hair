import {
  ADMIN_ROLE,
  BRANCH_MASTER_ROLE,
  INTEGRATED_MASTER_ROLE,
  normalizeAdminRole
} from "@/lib/roles";
import {
  createDocumentCustomerNameHash,
  createDocumentPhoneHash,
  createDocumentPhoneLast4Hash,
  decryptDocumentField,
  encryptDocumentField
} from "@/lib/documentSecurity";
import { getSupabaseAdmin } from "@/lib/supabase";

function now() {
  return new Date().toISOString();
}

function assertNoError(error, context) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function relationName(row) {
  if (!row) {
    return null;
  }

  if (Array.isArray(row.branches)) {
    return row.branches[0]?.name || null;
  }

  return row.branches?.name || null;
}

function templateName(row) {
  if (!row) {
    return null;
  }

  if (Array.isArray(row.templates)) {
    return row.templates[0]?.name || null;
  }

  return row.templates?.name || null;
}

function notificationTemplateName(row) {
  if (!row) {
    return null;
  }

  if (Array.isArray(row.notification_templates)) {
    return row.notification_templates[0]?.template_name || null;
  }

  return row.notification_templates?.template_name || null;
}

function normalizeTemplate(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    is_active: Boolean(row.is_active),
    sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    status: row.deleted_at ? "deleted" : row.is_active ? "active" : "inactive"
  };
}

function normalizeBranch(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    is_active: Boolean(row.is_active)
  };
}

function normalizeDesigner(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    is_active: Boolean(row.is_active),
    branch_name: relationName(row)
  };
}

function normalizeNotificationTemplate(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    is_active: Boolean(row.is_active),
    security_flag: Boolean(row.security_flag),
    remote_block: Boolean(row.remote_block),
    remote_dormant: Boolean(row.remote_dormant),
    status: row.deleted_at ? "deleted" : row.is_active ? "active" : "inactive"
  };
}

function normalizeDocument(row) {
  if (!row) {
    return null;
  }

  const customerName = decryptDocumentField(row.customer_name);
  const recipientPhone = decryptDocumentField(row.recipient_phone);

  return {
    ...row,
    customer_name: customerName,
    recipient_phone: recipientPhone,
    phone_last4: recipientPhone ? recipientPhone.slice(-4) : row.phone_last4 || "",
    template_name: row.template_name || templateName(row),
    notification_template_name:
      row.notification_template_name || notificationTemplateName(row)
  };
}

const DOCUMENT_LIST_SELECT = [
  "id",
  "token",
  "template_id",
  "notification_template_id",
  "branch_id",
  "branch_name",
  "designer_id",
  "designer_name",
  "document_title",
  "document_date",
  "customer_name",
  "phone_last4",
  "recipient_phone",
  "notification_template_name",
  "status",
  "viewed_at",
  "signed_at",
  "bizgo_status",
  "drive_pdf_file_id",
  "drive_pdf_url",
  "pdf_export_status",
  "created_at",
  "updated_at"
].join(", ");

const DOCUMENT_DASHBOARD_SELECT = [
  "id",
  "branch_id",
  "branch_name",
  "designer_name",
  "document_title",
  "customer_name",
  "status",
  "created_at",
  "updated_at",
  "signed_at"
].join(", ");

function normalizeAdminUser(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    role: normalizeAdminRole(row.role),
    is_active: Boolean(row.is_active),
    branch_name: relationName(row)
  };
}

function normalizeSession(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    role: normalizeAdminRole(row.role),
    is_master: Boolean(row.is_master),
    branch_name: relationName(row)
  };
}

function normalizeLoginAttempt(row) {
  if (!row) {
    return null;
  }

  return {
    ...row
  };
}

function getPageRange(page = 1, pageSize = 10) {
  const resolvedPage = Math.max(1, Math.floor(Number(page) || 1));
  const resolvedPageSize = Math.max(1, Math.floor(Number(pageSize) || 10));
  const from = (resolvedPage - 1) * resolvedPageSize;

  return {
    page: resolvedPage,
    pageSize: resolvedPageSize,
    from,
    to: from + resolvedPageSize - 1
  };
}

function buildPageResult(items, totalCount, currentPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    items,
    totalCount,
    currentPage: Math.min(currentPage, totalPages),
    totalPages,
    pageSize
  };
}

async function countRows(buildQuery, context) {
  const { count, error } = await buildQuery();
  assertNoError(error, context);
  return Number(count || 0);
}

async function selectPage({ buildQuery, context, normalizer, page = 1, pageSize = 10 }) {
  const initialRange = getPageRange(page, pageSize);
  let { data, error, count } = await buildQuery().range(initialRange.from, initialRange.to);
  assertNoError(error, context);

  const totalCount = Number(count || 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / initialRange.pageSize));
  const currentPage = Math.min(initialRange.page, totalPages);

  if (totalCount > 0 && currentPage !== initialRange.page) {
    const fallbackRange = getPageRange(currentPage, initialRange.pageSize);
    const fallbackResult = await buildQuery().range(fallbackRange.from, fallbackRange.to);
    assertNoError(fallbackResult.error, context);
    data = fallbackResult.data;
  }

  return buildPageResult(
    (data || []).map(normalizer),
    totalCount,
    currentPage,
    initialRange.pageSize
  );
}

function applyBranchFilters(query, { activeOnly = false, branchId, statusFilters } = {}) {
  let nextQuery = query;

  if (Array.isArray(statusFilters)) {
    nextQuery = applyActiveStatusFilters(nextQuery, statusFilters);
  }

  if (activeOnly) {
    nextQuery = nextQuery.eq("is_active", true);
  }

  if (branchId) {
    nextQuery = nextQuery.eq("id", branchId);
  }

  return nextQuery;
}

function activeStatusFilters(statusFilters) {
  return Array.isArray(statusFilters)
    ? [...new Set(statusFilters)].filter((item) => item === "active" || item === "inactive")
    : [];
}

function applyActiveStatusFilters(query, statusFilters) {
  const requestedStatuses = activeStatusFilters(statusFilters);

  if (requestedStatuses.length === 0 || requestedStatuses.length === 2) {
    return query;
  }

  if (requestedStatuses.includes("active")) {
    return query.eq("is_active", true);
  }

  if (requestedStatuses.includes("inactive")) {
    return query.eq("is_active", false);
  }

  return query.eq("id", -1);
}

function applyBranchSort(query, sortKey = "updated_at", direction = "desc") {
  const ascending = direction === "asc";

  switch (sortKey) {
    case "name":
      return query.order("name", { ascending });
    case "created_at":
      return query.order("created_at", { ascending });
    case "is_active":
      return query.order("is_active", { ascending }).order("updated_at", { ascending: false });
    case "updated_at":
    default:
      return query.order("updated_at", { ascending });
  }
}

function applyDesignerFilters(query, { activeOnly = false, branchId, statusFilters } = {}) {
  let nextQuery = query;

  if (Array.isArray(statusFilters)) {
    nextQuery = applyActiveStatusFilters(nextQuery, statusFilters);
  }

  if (activeOnly) {
    nextQuery = nextQuery.eq("is_active", true);
  }

  if (branchId) {
    nextQuery = nextQuery.eq("branch_id", branchId);
  }

  return nextQuery;
}

function applyDesignerSort(query, sortKey = "updated_at", direction = "desc") {
  const ascending = direction === "asc";

  switch (sortKey) {
    case "name":
      return query.order("name", { ascending });
    case "branch_name":
      return query.order("branches(name)", { ascending }).order("name", { ascending: true });
    case "is_active":
      return query.order("is_active", { ascending }).order("updated_at", { ascending: false });
    case "updated_at":
    default:
      return query.order("updated_at", { ascending });
  }
}

function applyTemplateFilters(
  query,
  { activeOnly = false, includeDeleted = false, status, statusFilters } = {}
) {
  let nextQuery = query;
  const requestedStatuses = Array.isArray(statusFilters)
    ? [...new Set(statusFilters)].filter((item) =>
        ["active", "inactive", "deleted"].includes(item)
      )
    : [];

  if (requestedStatuses.length > 0) {
    const hasActive = requestedStatuses.includes("active");
    const hasInactive = requestedStatuses.includes("inactive");
    const hasDeleted = requestedStatuses.includes("deleted");

    if (hasActive && hasInactive && hasDeleted) {
      return nextQuery;
    }

    if (hasActive && hasInactive) {
      return nextQuery.is("deleted_at", null);
    }

    if (hasActive && hasDeleted) {
      return nextQuery.or(
        "and(is_active.eq.true,deleted_at.is.null),deleted_at.not.is.null"
      );
    }

    if (hasInactive && hasDeleted) {
      return nextQuery.or(
        "and(is_active.eq.false,deleted_at.is.null),deleted_at.not.is.null"
      );
    }

    if (hasActive) {
      return nextQuery.eq("is_active", true).is("deleted_at", null);
    }

    if (hasInactive) {
      return nextQuery.eq("is_active", false).is("deleted_at", null);
    }

    if (hasDeleted) {
      return nextQuery.not("deleted_at", "is", null);
    }

    return nextQuery.eq("id", -1);
  }

  if (status === "active") {
    return nextQuery.eq("is_active", true).is("deleted_at", null);
  }

  if (status === "inactive") {
    return nextQuery.eq("is_active", false).is("deleted_at", null);
  }

  if (status === "deleted") {
    return nextQuery.not("deleted_at", "is", null);
  }

  if (activeOnly) {
    return nextQuery.eq("is_active", true).is("deleted_at", null);
  }

  if (!includeDeleted) {
    return nextQuery.is("deleted_at", null);
  }

  return nextQuery;
}

function applyTemplateSort(query, sortKey = "updated_at", direction = "desc") {
  const ascending = direction === "asc";

  switch (sortKey) {
    case "sort_order":
      return query
        .order("sort_order", { ascending })
        .order("name", { ascending: true })
        .order("updated_at", { ascending: false });
    case "name":
      return query.order("name", { ascending });
    case "document_title":
      return query.order("document_title", { ascending });
    case "status":
      return ascending
        ? query
            .order("deleted_at", { ascending: true, nullsFirst: true })
            .order("is_active", { ascending: false })
        : query
            .order("deleted_at", { ascending: false, nullsFirst: false })
            .order("is_active", { ascending: true });
    case "updated_at":
    default:
      return query.order("updated_at", { ascending });
  }
}

function applyNotificationTemplateFilters(
  query,
  {
    activeOnly = false,
    includeDeleted = false,
    status,
    inspectionStatus,
    statusFilters
  } = {}
) {
  let nextQuery = applyTemplateFilters(query, {
    activeOnly,
    includeDeleted,
    status,
    statusFilters
  });

  if (inspectionStatus) {
    nextQuery = nextQuery.eq("inspection_status", inspectionStatus);
  }

  return nextQuery;
}

function applyNotificationTemplateSort(query, sortKey = "updated_at", direction = "desc") {
  const ascending = direction === "asc";

  switch (sortKey) {
    case "template_name":
      return query.order("template_name", { ascending });
    case "template_code":
      return query.order("template_code", { ascending });
    case "inspection_status":
      return query.order("inspection_status", { ascending }).order("updated_at", {
        ascending: false
      });
    case "updated_at":
    default:
      return query.order("updated_at", { ascending });
  }
}

function applyDocumentFilters(
  query,
  { branchId, status, createdSince, signedSince, searchTerm } = {}
) {
  let nextQuery = query;

  if (branchId) {
    nextQuery = nextQuery.eq("branch_id", branchId);
  }

  if (status) {
    nextQuery = nextQuery.eq("status", status);
  }

  if (createdSince) {
    nextQuery = nextQuery.gte("created_at", createdSince);
  }

  if (signedSince) {
    nextQuery = nextQuery.gte("signed_at", signedSince);
  }

  const normalizedSearchTerm = String(searchTerm || "").trim();
  const phoneDigits = String(searchTerm || "").replace(/\D/g, "");
  const searchConditions = [];

  if (normalizedSearchTerm) {
    const customerNameHash = createDocumentCustomerNameHash(normalizedSearchTerm);

    if (customerNameHash) {
      searchConditions.push(`customer_name_hash.eq.${customerNameHash}`);
    }
  }

  if (phoneDigits.length >= 10) {
    const recipientPhoneHash = createDocumentPhoneHash(phoneDigits);

    if (recipientPhoneHash) {
      searchConditions.push(`recipient_phone_hash.eq.${recipientPhoneHash}`);
    }
  } else if (phoneDigits.length === 4) {
    const phoneLast4Hash = createDocumentPhoneLast4Hash(phoneDigits);

    if (phoneLast4Hash) {
      searchConditions.push(`phone_last4_hash.eq.${phoneLast4Hash}`);
    }
  }

  if (searchConditions.length > 0) {
    nextQuery = nextQuery.or(searchConditions.join(","));
  }

  return nextQuery;
}

function applyDocumentSort(query, sortKey = "created_at", direction = "desc") {
  const ascending = direction === "asc";

  switch (sortKey) {
    case "signed_at":
      return query.order("signed_at", { ascending, nullsFirst: !ascending });
    case "document_title":
      return query.order("document_title", { ascending });
    case "branch_name":
      return query.order("branch_name", { ascending });
    case "status":
      return query.order("status", { ascending }).order("created_at", { ascending: false });
    case "created_at":
    default:
      return query.order("created_at", { ascending });
  }
}

function protectDocumentIdentityFields(input) {
  const customerName = String(input.customer_name || "").trim();
  const recipientPhone = String(input.recipient_phone || "").trim();
  const phoneLast4 = recipientPhone ? recipientPhone.slice(-4) : String(input.phone_last4 || "");

  return {
    ...input,
    customer_name: encryptDocumentField(customerName),
    customer_name_hash: createDocumentCustomerNameHash(customerName),
    recipient_phone: recipientPhone ? encryptDocumentField(recipientPhone) : "",
    recipient_phone_hash: createDocumentPhoneHash(recipientPhone),
    phone_last4: phoneLast4,
    phone_last4_hash: createDocumentPhoneLast4Hash(phoneLast4)
  };
}

function formatInFilterValues(values = []) {
  const filtered = values.filter(
    (value) => value !== undefined && value !== null && String(value).trim() !== ""
  );

  if (filtered.length === 0) {
    return "";
  }

  return `(${filtered
    .map((value) => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
    .join(",")})`;
}

function applyAdminUserFilters(
  query,
  { branchId, role, excludeKakaoUserIds = [] } = {}
) {
  let nextQuery = query;

  if (branchId) {
    nextQuery = nextQuery.eq("branch_id", branchId);
  }

  if (role) {
    const normalizedRole = normalizeAdminRole(role);
    nextQuery =
      normalizedRole === ADMIN_ROLE
        ? nextQuery.in("role", [ADMIN_ROLE, BRANCH_MASTER_ROLE])
        : nextQuery.eq("role", normalizedRole);
  }

  const formatted = formatInFilterValues(excludeKakaoUserIds);

  if (formatted) {
    nextQuery = nextQuery.not("kakao_user_id", "in", formatted);
  }

  return nextQuery;
}

function applyAdminUserSort(query, sortKey = "updated_at", direction = "desc") {
  const ascending = direction === "asc";

  switch (sortKey) {
    case "role":
      return query.order("role", { ascending }).order("updated_at", { ascending: false });
    case "nickname":
      return query.order("nickname", { ascending }).order("updated_at", { ascending: false });
    case "kakao_user_id":
      return query.order("kakao_user_id", { ascending });
    case "branch_name":
      return query.order("branches(name)", { ascending }).order("updated_at", { ascending: false });
    case "updated_at":
    default:
      return query.order("updated_at", { ascending });
  }
}

function applyLoginAttemptFilters(query, { excludeKakaoUserIds = [] } = {}) {
  const formatted = formatInFilterValues(excludeKakaoUserIds);

  if (!formatted) {
    return query;
  }

  return query.not("kakao_user_id", "in", formatted);
}

function applyLoginAttemptSort(query, sortKey = "last_attempt_at", direction = "desc") {
  const ascending = direction === "asc";

  switch (sortKey) {
    case "attempt_count":
      return query.order("attempt_count", { ascending }).order("last_attempt_at", {
        ascending: false
      });
    case "nickname":
      return query.order("nickname", { ascending }).order("last_attempt_at", { ascending: false });
    case "kakao_user_id":
      return query.order("kakao_user_id", { ascending });
    case "last_attempt_at":
    default:
      return query.order("last_attempt_at", { ascending });
  }
}

export async function listBranches({ activeOnly = false, branchId } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("branches").select("*").order("name", { ascending: true });
  query = applyBranchFilters(query, { activeOnly, branchId });

  const { data, error } = await query;
  assertNoError(error, "지점 목록 조회 실패");
  return (data || []).map(normalizeBranch);
}

export async function listBranchesPage({
  activeOnly = false,
  branchId,
  page = 1,
  pageSize = 10,
  sortKey = "updated_at",
  direction = "desc",
  statusFilters
} = {}) {
  const supabase = getSupabaseAdmin();

  return await selectPage({
    buildQuery: () => {
      let query = supabase.from("branches").select("*", { count: "exact" });
      query = applyBranchFilters(query, { activeOnly, branchId, statusFilters });
      return applyBranchSort(query, sortKey, direction);
    },
    context: "지점 페이지 조회 실패",
    normalizer: normalizeBranch,
    page,
    pageSize
  });
}

export async function countBranches({ activeOnly = false, branchId, statusFilters } = {}) {
  const supabase = getSupabaseAdmin();

  return await countRows(() => {
    let query = supabase.from("branches").select("id", { count: "exact", head: true });
    return applyBranchFilters(query, { activeOnly, branchId, statusFilters });
  }, "지점 수 조회 실패");
}

export async function getBranchById(id) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  assertNoError(error, "지점 조회 실패");
  return normalizeBranch(data);
}

export async function createBranch(input) {
  const supabase = getSupabaseAdmin();
  const timestamp = now();
  const { data, error } = await supabase
    .from("branches")
    .insert({
      ...input,
      is_active: Boolean(input.is_active),
      created_at: timestamp,
      updated_at: timestamp
    })
    .select("*")
    .single();

  assertNoError(error, "지점 생성 실패");
  return normalizeBranch(data);
}

export async function updateBranch(id, input) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("branches")
    .update({
      ...input,
      is_active: Boolean(input.is_active),
      updated_at: now()
    })
    .eq("id", id)
    .select("*")
    .single();

  assertNoError(error, "지점 수정 실패");
  return normalizeBranch(data);
}

export async function deleteBranch(id) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("branches").delete().eq("id", id);
  assertNoError(error, "지점 삭제 실패");
}

export async function listDesigners({ activeOnly = false, branchId } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("designers")
    .select("*, branches(name)")
    .order("name", { ascending: true });
  query = applyDesignerFilters(query, { activeOnly, branchId });

  const { data, error } = await query;
  assertNoError(error, "디자이너 목록 조회 실패");
  return (data || []).map(normalizeDesigner);
}

export async function listDesignersPage({
  activeOnly = false,
  branchId,
  page = 1,
  pageSize = 10,
  sortKey = "updated_at",
  direction = "desc",
  statusFilters
} = {}) {
  const supabase = getSupabaseAdmin();

  return await selectPage({
    buildQuery: () => {
      let query = supabase
        .from("designers")
        .select("*, branches(name)", { count: "exact" });
      query = applyDesignerFilters(query, { activeOnly, branchId, statusFilters });
      return applyDesignerSort(query, sortKey, direction);
    },
    context: "디자이너 페이지 조회 실패",
    normalizer: normalizeDesigner,
    page,
    pageSize
  });
}

export async function countDesigners({ activeOnly = false, branchId, statusFilters } = {}) {
  const supabase = getSupabaseAdmin();

  return await countRows(() => {
    let query = supabase.from("designers").select("id", { count: "exact", head: true });
    return applyDesignerFilters(query, { activeOnly, branchId, statusFilters });
  }, "디자이너 수 조회 실패");
}

export async function getDesignerById(id) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("designers")
    .select("*, branches(name)")
    .eq("id", id)
    .maybeSingle();

  assertNoError(error, "디자이너 조회 실패");
  return normalizeDesigner(data);
}

export async function createDesigner(input) {
  const supabase = getSupabaseAdmin();
  const timestamp = now();
  const { data, error } = await supabase
    .from("designers")
    .insert({
      ...input,
      is_active: Boolean(input.is_active),
      created_at: timestamp,
      updated_at: timestamp
    })
    .select("*, branches(name)")
    .single();

  assertNoError(error, "디자이너 생성 실패");
  return normalizeDesigner(data);
}

export async function updateDesigner(id, input) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("designers")
    .update({
      ...input,
      is_active: Boolean(input.is_active),
      updated_at: now()
    })
    .eq("id", id)
    .select("*, branches(name)")
    .single();

  assertNoError(error, "디자이너 수정 실패");
  return normalizeDesigner(data);
}

export async function deleteDesigner(id) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("designers").delete().eq("id", id);
  assertNoError(error, "디자이너 삭제 실패");
}

export async function listTemplates({
  activeOnly = false,
  includeDeleted = false,
  sortKey = "sort_order",
  direction = "asc"
} = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("templates").select("*");
  query = applyTemplateFilters(query, { activeOnly, includeDeleted });
  query = applyTemplateSort(query, sortKey, direction);

  const { data, error } = await query;
  assertNoError(error, "템플릿 목록 조회 실패");
  return (data || []).map(normalizeTemplate);
}

export async function listTemplatesPage({
  activeOnly = false,
  includeDeleted = false,
  page = 1,
  pageSize = 10,
  sortKey = "sort_order",
  direction = "asc",
  statusFilters
} = {}) {
  const supabase = getSupabaseAdmin();

  return await selectPage({
    buildQuery: () => {
      let query = supabase.from("templates").select("*", { count: "exact" });
      query = applyTemplateFilters(query, { activeOnly, includeDeleted, statusFilters });
      return applyTemplateSort(query, sortKey, direction);
    },
    context: "템플릿 페이지 조회 실패",
    normalizer: normalizeTemplate,
    page,
    pageSize
  });
}

export async function countTemplates({
  activeOnly = false,
  includeDeleted = false,
  status
} = {}) {
  const supabase = getSupabaseAdmin();

  return await countRows(() => {
    let query = supabase.from("templates").select("id", { count: "exact", head: true });
    return applyTemplateFilters(query, { activeOnly, includeDeleted, status });
  }, "템플릿 수 조회 실패");
}

export async function getTemplateById(id) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  assertNoError(error, "템플릿 조회 실패");
  return normalizeTemplate(data);
}

function buildTemplateLifecycleInput(input, existingDeletedAt = null) {
  const status = String(
    input.status ||
      (input.deleted_at ? "deleted" : input.is_active ? "active" : "inactive")
  );

  return {
    is_active: status === "active",
    deleted_at: status === "deleted" ? existingDeletedAt || now() : null
  };
}

function buildNotificationTemplateLifecycleInput(input, existingDeletedAt = null) {
  const status = String(
    input.status ||
      (input.deleted_at ? "deleted" : input.is_active ? "active" : "inactive")
  );

  return {
    is_active: status === "active",
    deleted_at: status === "deleted" ? existingDeletedAt || now() : null
  };
}

export async function createTemplate(input) {
  const supabase = getSupabaseAdmin();
  const timestamp = now();
  const { status, ...templateInput } = input;
  const lifecycle = buildTemplateLifecycleInput(input);
  const { data, error } = await supabase
    .from("templates")
    .insert({
      ...templateInput,
      is_active: lifecycle.is_active,
      deleted_at: lifecycle.deleted_at,
      created_at: timestamp,
      updated_at: timestamp
    })
    .select("*")
    .single();

  assertNoError(error, "템플릿 생성 실패");
  return normalizeTemplate(data);
}

export async function updateTemplate(id, input) {
  const supabase = getSupabaseAdmin();
  const current = await getTemplateById(id);

  if (!current) {
    throw new Error("템플릿 수정 실패: 존재하지 않는 템플릿입니다.");
  }

  const { status, ...templateInput } = input;
  const lifecycle = buildTemplateLifecycleInput(input, current.deleted_at);
  const { data, error } = await supabase
    .from("templates")
    .update({
      ...templateInput,
      is_active: lifecycle.is_active,
      deleted_at: lifecycle.deleted_at,
      updated_at: now()
    })
    .eq("id", id)
    .select("*")
    .single();

  assertNoError(error, "템플릿 수정 실패");
  return normalizeTemplate(data);
}

export async function deleteTemplate(id) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("templates")
    .update({
      is_active: false,
      deleted_at: now(),
      updated_at: now()
    })
    .eq("id", id);
  assertNoError(error, "템플릿 삭제 실패");
}

export async function listNotificationTemplates({
  activeOnly = false,
  includeDeleted = false
} = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("notification_templates")
    .select("*")
    .order("updated_at", { ascending: false });
  query = applyNotificationTemplateFilters(query, { activeOnly, includeDeleted });

  const { data, error } = await query;
  assertNoError(error, "알림톡 템플릿 목록 조회 실패");
  return (data || []).map(normalizeNotificationTemplate);
}

export async function listNotificationTemplatesPage({
  activeOnly = false,
  includeDeleted = false,
  page = 1,
  pageSize = 10,
  sortKey = "updated_at",
  direction = "desc",
  statusFilters
} = {}) {
  const supabase = getSupabaseAdmin();

  return await selectPage({
    buildQuery: () => {
      let query = supabase
        .from("notification_templates")
        .select("*", { count: "exact" });
      query = applyNotificationTemplateFilters(query, {
        activeOnly,
        includeDeleted,
        statusFilters
      });
      return applyNotificationTemplateSort(query, sortKey, direction);
    },
    context: "알림톡 템플릿 페이지 조회 실패",
    normalizer: normalizeNotificationTemplate,
    page,
    pageSize
  });
}

export async function countNotificationTemplates({
  activeOnly = false,
  includeDeleted = false,
  status,
  statusFilters,
  inspectionStatus
} = {}) {
  const supabase = getSupabaseAdmin();

  return await countRows(() => {
    let query = supabase
      .from("notification_templates")
      .select("id", { count: "exact", head: true });
    return applyNotificationTemplateFilters(query, {
      activeOnly,
      includeDeleted,
      status,
      statusFilters,
      inspectionStatus
    });
  }, "알림톡 템플릿 수 조회 실패");
}

export async function getNotificationTemplateById(id) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  assertNoError(error, "알림톡 템플릿 조회 실패");
  return normalizeNotificationTemplate(data);
}

export async function getNotificationTemplateByCode(templateCode) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*")
    .eq("template_code", templateCode)
    .maybeSingle();

  assertNoError(error, "알림톡 템플릿 중복 조회 실패");
  return normalizeNotificationTemplate(data);
}

export async function createNotificationTemplate(input) {
  const supabase = getSupabaseAdmin();
  const timestamp = now();
  const { status, ...templateInput } = input;
  const lifecycle = buildNotificationTemplateLifecycleInput(input);
  const { data, error } = await supabase
    .from("notification_templates")
    .insert({
      ...templateInput,
      is_active: lifecycle.is_active,
      deleted_at: lifecycle.deleted_at,
      created_at: timestamp,
      updated_at: timestamp
    })
    .select("*")
    .single();

  assertNoError(error, "알림톡 템플릿 생성 실패");
  return normalizeNotificationTemplate(data);
}

export async function updateNotificationTemplate(id, input, { currentTemplate } = {}) {
  const supabase = getSupabaseAdmin();
  const current = currentTemplate || (await getNotificationTemplateById(id));

  if (!current) {
    throw new Error("알림톡 템플릿 수정 실패: 존재하지 않는 템플릿입니다.");
  }

  const { status, ...templateInput } = input;
  const lifecycle = buildNotificationTemplateLifecycleInput(input, current.deleted_at);
  const { data, error } = await supabase
    .from("notification_templates")
    .update({
      ...templateInput,
      is_active: lifecycle.is_active,
      deleted_at: lifecycle.deleted_at,
      updated_at: now()
    })
    .eq("id", id)
    .select("*")
    .single();

  assertNoError(error, "알림톡 템플릿 수정 실패");
  return normalizeNotificationTemplate(data);
}

export async function deleteNotificationTemplate(id) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("notification_templates")
    .update({
      is_active: false,
      deleted_at: now(),
      updated_at: now()
    })
    .eq("id", id);

  assertNoError(error, "알림톡 템플릿 삭제 실패");
}

export async function listDocuments({
  branchId,
  status,
  createdSince,
  signedSince,
  searchTerm,
  select = DOCUMENT_LIST_SELECT,
  sortKey = "created_at",
  direction = "desc",
  limit
} = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("documents").select(select);
  query = applyDocumentFilters(query, { branchId, status, createdSince, signedSince, searchTerm });
  query = applyDocumentSort(query, sortKey, direction);

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  assertNoError(error, "문서 목록 조회 실패");
  return (data || []).map(normalizeDocument);
}

export async function listDocumentsForDashboard({
  branchId,
  status,
  createdSince,
  signedSince,
  searchTerm
} = {}) {
  return await listDocuments({
    branchId,
    status,
    createdSince,
    signedSince,
    searchTerm,
    select: DOCUMENT_DASHBOARD_SELECT
  });
}

export async function listDocumentsPage({
  branchId,
  status,
  createdSince,
  signedSince,
  searchTerm,
  page = 1,
  pageSize = 10,
  select = DOCUMENT_LIST_SELECT,
  sortKey = "created_at",
  direction = "desc"
} = {}) {
  const supabase = getSupabaseAdmin();

  return await selectPage({
    buildQuery: () => {
      let query = supabase.from("documents").select(select, { count: "exact" });
      query = applyDocumentFilters(query, {
        branchId,
        status,
        createdSince,
        signedSince,
        searchTerm
      });
      return applyDocumentSort(query, sortKey, direction);
    },
    context: "문서 페이지 조회 실패",
    normalizer: normalizeDocument,
    page,
    pageSize
  });
}

export async function countDocuments({
  branchId,
  status,
  createdSince,
  signedSince,
  searchTerm
} = {}) {
  const supabase = getSupabaseAdmin();

  return await countRows(() => {
    let query = supabase.from("documents").select("id", { count: "exact", head: true });
    return applyDocumentFilters(query, {
      branchId,
      status,
      createdSince,
      signedSince,
      searchTerm
    });
  }, "문서 수 조회 실패");
}

export async function listDocumentsByIds(ids = []) {
  const normalizedIds = Array.from(
    new Set(
      ids
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    )
  );

  if (normalizedIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .select("*, templates(name), notification_templates(template_name)")
    .in("id", normalizedIds);

  assertNoError(error, "문서 상세 목록 조회 실패");
  return (data || []).map(normalizeDocument);
}

export async function getDocumentByToken(token) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .select("*, templates(name), notification_templates(template_name)")
    .eq("token", token)
    .maybeSingle();

  assertNoError(error, "문서 조회 실패");
  return normalizeDocument(data);
}

export async function createDocument(input) {
  const supabase = getSupabaseAdmin();
  const timestamp = now();
  const protectedInput = protectDocumentIdentityFields(input);
  const { data, error } = await supabase
    .from("documents")
    .insert({
      ...protectedInput,
      branch_id: protectedInput.branch_id,
      designer_id: protectedInput.designer_id,
      notification_template_id: protectedInput.notification_template_id || null,
      status: protectedInput.status || "pending",
      bizgo_status: protectedInput.bizgo_status || null,
      bizgo_response: protectedInput.bizgo_response || null,
      created_at: timestamp,
      updated_at: timestamp
    })
    .select("*")
    .single();

  assertNoError(error, "문서 생성 실패");
  return normalizeDocument(data);
}

export async function updateDocument(token, input) {
  const supabase = getSupabaseAdmin();
  const protectedInput = protectDocumentIdentityFields(input);
  const { data, error } = await supabase
    .from("documents")
    .update({
      ...protectedInput,
      notification_template_id: protectedInput.notification_template_id || null,
      updated_at: now()
    })
    .eq("token", token)
    .select("*")
    .maybeSingle();

  assertNoError(error, "문서 수정 실패");

  if (!data) {
    throw new Error("문서 수정 실패: 존재하지 않는 문서입니다.");
  }

  return normalizeDocument(data);
}

export async function markDocumentViewed(token) {
  const supabase = getSupabaseAdmin();
  const timestamp = now();
  const { data, error } = await supabase
    .from("documents")
    .select("viewed_at")
    .eq("token", token)
    .maybeSingle();

  assertNoError(error, "문서 열람 상태 조회 실패");

  const { error: updateError } = await supabase
    .from("documents")
    .update({
      viewed_at: data?.viewed_at || timestamp,
      updated_at: timestamp
    })
    .eq("token", token);

  assertNoError(updateError, "문서 열람 상태 저장 실패");
}

export async function signDocument(token, signatureStoragePath) {
  const timestamp = now();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .update({
      status: "signed",
      signature_storage_path: signatureStoragePath,
      signed_at: timestamp,
      drive_pdf_file_id: null,
      drive_pdf_url: null,
      pdf_export_status: "pending",
      pdf_export_error: null,
      pdf_exported_at: null,
      pdf_export_updated_at: timestamp,
      updated_at: timestamp
    })
    .eq("token", token)
    .select("*, templates(name), notification_templates(template_name)")
    .single();

  assertNoError(error, "문서 서명 저장 실패");
  return normalizeDocument(data);
}

export async function markDocumentPdfExportProcessing(token) {
  const timestamp = now();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("documents")
    .update({
      pdf_export_status: "processing",
      pdf_export_error: null,
      pdf_export_updated_at: timestamp,
      updated_at: timestamp
    })
    .eq("token", token);

  assertNoError(error, "PDF 업로드 처리 상태 저장 실패");
}

export async function markDocumentPdfExportUploaded(token, { fileId, fileUrl }) {
  const timestamp = now();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("documents")
    .update({
      drive_pdf_file_id: fileId || null,
      drive_pdf_url: fileUrl || null,
      pdf_export_status: "uploaded",
      pdf_export_error: null,
      pdf_exported_at: timestamp,
      pdf_export_updated_at: timestamp,
      updated_at: timestamp
    })
    .eq("token", token);

  assertNoError(error, "PDF 업로드 완료 상태 저장 실패");
}

export async function markDocumentPdfExportFailed(token, errorMessage) {
  const timestamp = now();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("documents")
    .update({
      pdf_export_status: "failed",
      pdf_export_error: errorMessage || "PDF 업로드 실패",
      pdf_export_updated_at: timestamp,
      updated_at: timestamp
    })
    .eq("token", token);

  assertNoError(error, "PDF 업로드 실패 상태 저장 실패");
}

export async function markDocumentPdfExportSkipped(token, reason) {
  const timestamp = now();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("documents")
    .update({
      pdf_export_status: "skipped",
      pdf_export_error: reason || null,
      pdf_export_updated_at: timestamp,
      updated_at: timestamp
    })
    .eq("token", token);

  assertNoError(error, "PDF 업로드 건너뜀 상태 저장 실패");
}

export async function updateDocumentBizgo(token, status, response) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("documents")
    .update({
      bizgo_status: status,
      bizgo_response: response || null,
      updated_at: now()
    })
    .eq("token", token);

  assertNoError(error, "Bizgo 상태 저장 실패");
}

export async function listAdminUsers({ branchId } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("admin_users")
    .select("*, branches(name)")
    .order("updated_at", { ascending: false });

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  assertNoError(error, "관리자 목록 조회 실패");
  return (data || []).map(normalizeAdminUser);
}

export async function listAdminUsersPage({
  branchId,
  page = 1,
  pageSize = 10,
  sortKey = "updated_at",
  direction = "desc",
  role,
  excludeKakaoUserIds = []
} = {}) {
  const supabase = getSupabaseAdmin();

  return await selectPage({
    buildQuery: () => {
      let query = supabase
        .from("admin_users")
        .select("*, branches(name)", { count: "exact" });
      query = applyAdminUserFilters(query, { branchId, role, excludeKakaoUserIds });
      return applyAdminUserSort(query, sortKey, direction);
    },
    context: "관리자 페이지 조회 실패",
    normalizer: normalizeAdminUser,
    page,
    pageSize
  });
}

export async function listAdminUsersSlice({
  branchId,
  offset = 0,
  limit = 10,
  sortKey = "updated_at",
  direction = "desc",
  role,
  excludeKakaoUserIds = []
} = {}) {
  if (limit <= 0) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  let query = supabase.from("admin_users").select("*, branches(name)");
  query = applyAdminUserFilters(query, { branchId, role, excludeKakaoUserIds });
  query = applyAdminUserSort(query, sortKey, direction);

  const { data, error } = await query.range(offset, offset + limit - 1);
  assertNoError(error, "관리자 슬라이스 조회 실패");
  return (data || []).map(normalizeAdminUser);
}

export async function countAdminUsers({
  branchId,
  role,
  excludeKakaoUserIds = []
} = {}) {
  const supabase = getSupabaseAdmin();

  return await countRows(() => {
    let query = supabase.from("admin_users").select("id", { count: "exact", head: true });
    return applyAdminUserFilters(query, { branchId, role, excludeKakaoUserIds });
  }, "관리자 수 조회 실패");
}

export async function listAdminUserKakaoIds({ branchId } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("admin_users").select("kakao_user_id");

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  assertNoError(error, "관리자 카카오 ID 목록 조회 실패");
  return (data || []).map((row) => String(row.kakao_user_id)).filter(Boolean);
}

export async function createAdminUser(input) {
  const supabase = getSupabaseAdmin();
  const existing = await getAdminUserByKakaoId(String(input.kakao_user_id), {
    includeInactive: true
  });
  const timestamp = now();
  const normalizedRole = normalizeAdminRole(input.role);
  const { error } = await supabase.from("admin_users").upsert(
    {
      kakao_user_id: String(input.kakao_user_id),
      nickname: input.nickname || "",
      memo: input.memo || "",
      role: normalizedRole,
      branch_id: normalizedRole === INTEGRATED_MASTER_ROLE ? null : input.branch_id || null,
      is_active: Boolean(input.is_active),
      created_at: existing?.created_at || timestamp,
      updated_at: timestamp
    },
    { onConflict: "kakao_user_id" }
  );

  assertNoError(error, "관리자 저장 실패");
}

export async function deleteAdminUser(id) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("admin_users").delete().eq("id", id);
  assertNoError(error, "관리자 삭제 실패");
}

export async function getAdminUserById(id, { includeInactive = false } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("admin_users")
    .select("*, branches(name)")
    .eq("id", id);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.maybeSingle();
  assertNoError(error, "관리자 단건 조회 실패");
  return normalizeAdminUser(data);
}

export async function getAdminUserByKakaoId(kakaoUserId, { includeInactive = false } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("admin_users")
    .select("*, branches(name)")
    .eq("kakao_user_id", kakaoUserId);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.maybeSingle();
  assertNoError(error, "관리자 권한 조회 실패");
  return normalizeAdminUser(data);
}

export async function listLoginAttempts() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("login_attempts")
    .select("*")
    .order("last_attempt_at", { ascending: false });

  assertNoError(error, "로그인 시도 목록 조회 실패");
  return (data || []).map(normalizeLoginAttempt);
}

export async function listLoginAttemptsPage({
  page = 1,
  pageSize = 10,
  sortKey = "last_attempt_at",
  direction = "desc",
  excludeKakaoUserIds = []
} = {}) {
  const supabase = getSupabaseAdmin();

  return await selectPage({
    buildQuery: () => {
      let query = supabase.from("login_attempts").select("*", { count: "exact" });
      query = applyLoginAttemptFilters(query, { excludeKakaoUserIds });
      return applyLoginAttemptSort(query, sortKey, direction);
    },
    context: "로그인 시도 페이지 조회 실패",
    normalizer: normalizeLoginAttempt,
    page,
    pageSize
  });
}

export async function countLoginAttempts({ excludeKakaoUserIds = [] } = {}) {
  const supabase = getSupabaseAdmin();

  return await countRows(() => {
    let query = supabase.from("login_attempts").select("id", { count: "exact", head: true });
    return applyLoginAttemptFilters(query, { excludeKakaoUserIds });
  }, "로그인 시도 수 조회 실패");
}

export async function recordLoginAttempt({ kakao_user_id, nickname, status }) {
  const supabase = getSupabaseAdmin();
  const existing = await getLoginAttemptByKakaoId(kakao_user_id);
  const timestamp = now();
  const { error: logError } = await supabase.from("login_attempt_logs").insert({
    kakao_user_id,
    nickname: nickname || "",
    status,
    attempted_at: timestamp,
    created_at: timestamp
  });

  assertNoError(logError, "로그인 시도 이벤트 저장 실패");

  if (!existing) {
    const { error } = await supabase.from("login_attempts").insert({
      kakao_user_id,
      nickname: nickname || "",
      attempt_count: 1,
      last_status: status,
      first_attempt_at: timestamp,
      last_attempt_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp
    });

    assertNoError(error, "로그인 시도 저장 실패");
    return;
  }

  const { error } = await supabase
    .from("login_attempts")
    .update({
      nickname: nickname || existing.nickname || "",
      attempt_count: Number(existing.attempt_count || 0) + 1,
      last_status: status,
      last_attempt_at: timestamp,
      updated_at: timestamp
    })
    .eq("kakao_user_id", kakao_user_id);

  assertNoError(error, "로그인 시도 갱신 실패");
}

export async function getLoginAttemptByKakaoId(kakaoUserId) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("login_attempts")
    .select("*")
    .eq("kakao_user_id", kakaoUserId)
    .maybeSingle();

  assertNoError(error, "로그인 시도 조회 실패");
  return normalizeLoginAttempt(data);
}

export async function createSession(input) {
  const supabase = getSupabaseAdmin();
  const normalizedRole = normalizeAdminRole(input.role);
  const { error } = await supabase.from("sessions").insert({
    ...input,
    branch_id: normalizedRole === INTEGRATED_MASTER_ROLE ? null : input.branch_id || null,
    role: normalizedRole,
    is_master: normalizedRole === INTEGRATED_MASTER_ROLE && Boolean(input.is_master),
    created_at: now()
  });

  assertNoError(error, "세션 생성 실패");
}

export async function getSession(sessionToken) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sessions")
    .select("*, branches(name)")
    .eq("session_token", sessionToken)
    .gt("expires_at", now())
    .maybeSingle();

  assertNoError(error, "세션 조회 실패");
  return normalizeSession(data);
}

export async function deleteSession(sessionToken) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("session_token", sessionToken);

  assertNoError(error, "세션 삭제 실패");
}

export async function deleteSessionsByKakaoUserId(kakaoUserId) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("kakao_user_id", String(kakaoUserId));

  assertNoError(error, "사용자 세션 삭제 실패");
}
