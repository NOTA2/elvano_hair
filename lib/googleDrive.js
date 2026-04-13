import { Readable } from "node:stream";
import { google } from "googleapis";

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];
const GOOGLE_DOC_MIME_TYPE = "application/vnd.google-apps.document";
const PDF_MIME_TYPE = "application/pdf";
const HTML_MIME_TYPE = "text/html";

let driveClientPromise = null;
let serviceAccountCredentialsPromise = null;

function getImpersonatedUserEmail() {
  return String(process.env.GOOGLE_DRIVE_IMPERSONATED_USER_EMAIL || "").trim();
}

function getCredentialConfigValue() {
  return process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON_BASE64 || "";
}

function parseDriveFolderId(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "";
  }

  const folderMatch = normalized.match(/\/folders\/([a-zA-Z0-9_-]+)/);

  if (folderMatch?.[1]) {
    return folderMatch[1];
  }

  return /^[a-zA-Z0-9_-]{10,}$/.test(normalized) ? normalized : "";
}

export function getGoogleDriveFolderId() {
  return parseDriveFolderId(
    process.env.GOOGLE_DRIVE_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_URL || ""
  );
}

export function isGoogleDriveExportConfigured() {
  return Boolean(getGoogleDriveFolderId() && getCredentialConfigValue());
}

function parseServiceAccountJson(rawValue, sourceName) {
  try {
    const credentials = JSON.parse(rawValue);

    if (!credentials?.client_email || !credentials?.private_key) {
      throw new Error("서비스 계정 JSON에 client_email 또는 private_key가 없습니다.");
    }

    return credentials;
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    throw new Error(`${sourceName} 서비스 계정 JSON 파싱 실패: ${message}`);
  }
}

async function loadServiceAccountCredentials() {
  if (!serviceAccountCredentialsPromise) {
    serviceAccountCredentialsPromise = (async () => {
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON_BASE64) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_JSON_BASE64 환경변수가 필요합니다.");
      }

      const rawJson = Buffer.from(
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON_BASE64,
        "base64"
      ).toString("utf8");
      return parseServiceAccountJson(rawJson, "GOOGLE_SERVICE_ACCOUNT_KEY_JSON_BASE64");
    })().catch((error) => {
      serviceAccountCredentialsPromise = null;
      throw error;
    });
  }

  return await serviceAccountCredentialsPromise;
}

async function getDriveClient() {
  if (!driveClientPromise) {
    driveClientPromise = (async () => {
      const credentials = await loadServiceAccountCredentials();
      const authClient = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        keyId: credentials.private_key_id,
        scopes: DRIVE_SCOPES
      });

      const impersonatedUserEmail = getImpersonatedUserEmail();

      if (impersonatedUserEmail) {
        authClient.subject = impersonatedUserEmail;
      }

      return google.drive({ version: "v3", auth: authClient });
    })().catch((error) => {
      driveClientPromise = null;
      throw error;
    });
  }

  return await driveClientPromise;
}

async function createGoogleDocFromHtml({ html, name, folderId }) {
  const drive = await getDriveClient();
  const { data } = await drive.files.create({
    requestBody: {
      name,
      mimeType: GOOGLE_DOC_MIME_TYPE,
      parents: [folderId]
    },
    media: {
      mimeType: HTML_MIME_TYPE,
      body: Readable.from([html])
    },
    fields: "id,name,webViewLink",
    supportsAllDrives: true
  });

  return data;
}

async function exportGoogleDocToPdfBuffer(fileId) {
  const drive = await getDriveClient();
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { data } = await drive.files.export(
        {
          fileId,
          mimeType: PDF_MIME_TYPE
        },
        {
          responseType: "arraybuffer"
        }
      );

      return Buffer.from(data);
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }

  throw lastError;
}

async function uploadPdfFile({ pdfBuffer, name, folderId }) {
  const drive = await getDriveClient();
  const { data } = await drive.files.create({
    requestBody: {
      name,
      mimeType: PDF_MIME_TYPE,
      parents: [folderId]
    },
    media: {
      mimeType: PDF_MIME_TYPE,
      body: Readable.from([pdfBuffer])
    },
    fields: "id,name,webViewLink,webContentLink",
    supportsAllDrives: true
  });

  return data;
}

export async function deleteGoogleDriveFile(fileId) {
  if (!fileId) {
    return;
  }

  const drive = await getDriveClient();
  await drive.files.delete({
    fileId,
    supportsAllDrives: true
  });
}

export async function createDrivePdfFromHtml({ html, pdfName, folderId = getGoogleDriveFolderId() }) {
  const resolvedFolderId = parseDriveFolderId(folderId);

  if (!resolvedFolderId) {
    throw new Error("Google Drive 폴더 ID가 설정되지 않았습니다.");
  }

  const baseName = String(pdfName || "signed-document.pdf").replace(/\.pdf$/i, "");
  const tempDoc = await createGoogleDocFromHtml({
    html,
    name: `${baseName} 변환용`,
    folderId: resolvedFolderId
  });

  try {
    const pdfBuffer = await exportGoogleDocToPdfBuffer(tempDoc.id);
    return await uploadPdfFile({
      pdfBuffer,
      name: `${baseName}.pdf`,
      folderId: resolvedFolderId
    });
  } finally {
    await deleteGoogleDriveFile(tempDoc.id).catch((error) => {
      console.error("Google Drive 임시 문서 삭제 실패", error);
    });
  }
}
