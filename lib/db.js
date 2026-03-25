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
    status: row.deleted_at ? "deleted" : row.is_active ? "active" : "inactive",
    branch_name: relationName(row)
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
    status: row.deleted_at ? "deleted" : row.is_active ? "active" : "inactive",
    branch_name: relationName(row)
  };
}

function normalizeDocument(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    template_name: row.template_name || templateName(row),
    notification_template_name:
      row.notification_template_name || notificationTemplateName(row)
  };
}

function normalizeAdminUser(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
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

export async function listBranches({ activeOnly = false, branchId } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("branches").select("*").order("name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  if (branchId) {
    query = query.eq("id", branchId);
  }

  const { data, error } = await query;
  assertNoError(error, "지점 목록 조회 실패");
  return (data || []).map(normalizeBranch);
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

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  assertNoError(error, "디자이너 목록 조회 실패");
  return (data || []).map(normalizeDesigner);
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

export async function listTemplates({ activeOnly = false, branchId, includeDeleted = false } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("templates")
    .select("*, branches(name)")
    .order("updated_at", { ascending: false });

  if (activeOnly) {
    query = query.eq("is_active", true).is("deleted_at", null);
  } else if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  assertNoError(error, "템플릿 목록 조회 실패");
  return (data || []).map(normalizeTemplate);
}

export async function getTemplateById(id) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("templates")
    .select("*, branches(name)")
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
      branch_id: templateInput.branch_id || null,
      is_active: lifecycle.is_active,
      deleted_at: lifecycle.deleted_at,
      created_at: timestamp,
      updated_at: timestamp
    })
    .select("*, branches(name)")
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
      branch_id: templateInput.branch_id || null,
      is_active: lifecycle.is_active,
      deleted_at: lifecycle.deleted_at,
      updated_at: now()
    })
    .eq("id", id)
    .select("*, branches(name)")
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
  branchId,
  includeDeleted = false
} = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("notification_templates")
    .select("*, branches(name)")
    .order("updated_at", { ascending: false });

  if (activeOnly) {
    query = query.eq("is_active", true).is("deleted_at", null);
  } else if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  assertNoError(error, "알림톡 템플릿 목록 조회 실패");
  return (data || []).map(normalizeNotificationTemplate);
}

export async function getNotificationTemplateById(id) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*, branches(name)")
    .eq("id", id)
    .maybeSingle();

  assertNoError(error, "알림톡 템플릿 조회 실패");
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
      branch_id: templateInput.branch_id,
      is_active: lifecycle.is_active,
      deleted_at: lifecycle.deleted_at,
      created_at: timestamp,
      updated_at: timestamp
    })
    .select("*, branches(name)")
    .single();

  assertNoError(error, "알림톡 템플릿 생성 실패");
  return normalizeNotificationTemplate(data);
}

export async function updateNotificationTemplate(id, input) {
  const supabase = getSupabaseAdmin();
  const current = await getNotificationTemplateById(id);

  if (!current) {
    throw new Error("알림톡 템플릿 수정 실패: 존재하지 않는 템플릿입니다.");
  }

  const { status, ...templateInput } = input;
  const lifecycle = buildNotificationTemplateLifecycleInput(input, current.deleted_at);
  const { data, error } = await supabase
    .from("notification_templates")
    .update({
      ...templateInput,
      branch_id: templateInput.branch_id,
      is_active: lifecycle.is_active,
      deleted_at: lifecycle.deleted_at,
      updated_at: now()
    })
    .eq("id", id)
    .select("*, branches(name)")
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

export async function listDocuments({ branchId } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("documents")
    .select("*, templates(name), notification_templates(template_name)")
    .order("created_at", { ascending: false });

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  assertNoError(error, "문서 목록 조회 실패");
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
  const { data, error } = await supabase
    .from("documents")
    .insert({
      ...input,
      branch_id: input.branch_id,
      designer_id: input.designer_id,
      notification_template_id: input.notification_template_id || null,
      status: input.status || "pending",
      bizgo_status: input.bizgo_status || null,
      bizgo_response: input.bizgo_response || null,
      created_at: timestamp,
      updated_at: timestamp
    })
    .select("*")
    .single();

  assertNoError(error, "문서 생성 실패");
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

export async function signDocument(token, signatureDataUrl) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .update({
      status: "signed",
      signature_data_url: signatureDataUrl,
      signed_at: now(),
      updated_at: now()
    })
    .eq("token", token)
    .select("*, templates(name), notification_templates(template_name)")
    .single();

  assertNoError(error, "문서 서명 저장 실패");
  return normalizeDocument(data);
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

export async function createAdminUser(input) {
  const supabase = getSupabaseAdmin();
  const existing = await getAdminUserByKakaoId(String(input.kakao_user_id), {
    includeInactive: true
  });
  const timestamp = now();
  const { error } = await supabase.from("admin_users").upsert(
    {
      kakao_user_id: String(input.kakao_user_id),
      nickname: input.nickname || "",
      memo: input.memo || "",
      role: input.role,
      branch_id: input.branch_id || null,
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
  const { error } = await supabase.from("sessions").insert({
    ...input,
    branch_id: input.branch_id || null,
    role: input.role,
    is_master: Boolean(input.is_master),
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
