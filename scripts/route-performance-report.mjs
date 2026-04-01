#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const NEXT_DIR = path.join(ROOT_DIR, ".next");
const APP_BUILD_MANIFEST_PATH = path.join(NEXT_DIR, "app-build-manifest.json");

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes >= 100 * 1024 ? 0 : 1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parseTop(argv) {
  const topIndex = argv.indexOf("--top");

  if (topIndex === -1) {
    return 10;
  }

  const value = Number(argv[topIndex + 1]);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

function normalizeRoute(routeKey) {
  if (!routeKey.endsWith("/page")) {
    return null;
  }

  const withoutPageSuffix = routeKey.slice(0, -"/page".length) || "/";
  const withoutGroups = withoutPageSuffix.replace(/\/\([^)]+\)/g, "") || "/";

  if (withoutGroups.startsWith("/_")) {
    return null;
  }

  return withoutGroups;
}

function renderTable(headers, rows) {
  const headerRow = `| ${headers.join(" | ")} |`;
  const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
  const bodyRows = rows.map((row) => `| ${row.join(" | ")} |`);

  return [headerRow, separatorRow, ...bodyRows].join("\n");
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readFileSize(relativeNextPath) {
  try {
    const stats = await fs.stat(path.join(NEXT_DIR, relativeNextPath));
    return stats.size;
  } catch {
    return 0;
  }
}

async function main() {
  const top = parseTop(process.argv.slice(2));

  let appBuildManifest;

  try {
    appBuildManifest = await readJson(APP_BUILD_MANIFEST_PATH);
  } catch {
    console.error("`.next/app-build-manifest.json`을 찾지 못했습니다. 먼저 `npm run build`를 실행하세요.");
    process.exitCode = 1;
    return;
  }

  const pageEntries = Object.entries(appBuildManifest.pages || {})
    .map(([routeKey, files]) => {
      const route = normalizeRoute(routeKey);

      if (!route) {
        return null;
      }

      return {
        route,
        files: [...new Set(files)]
      };
    })
    .filter(Boolean);

  const fileUseCounts = new Map();

  pageEntries.forEach(({ files }) => {
    files.forEach((file) => {
      fileUseCounts.set(file, (fileUseCounts.get(file) || 0) + 1);
    });
  });

  const routeSummaries = await Promise.all(
    pageEntries.map(async ({ route, files }) => {
      const sizedFiles = await Promise.all(
        files.map(async (file) => ({
          file,
          size: await readFileSize(file)
        }))
      );

      const summary = sizedFiles.reduce(
        (acc, item) => {
          acc.total += item.size;

          if (item.file.endsWith(".js")) {
            acc.js += item.size;
          }

          if (item.file.endsWith(".css")) {
            acc.css += item.size;
          }

          if ((fileUseCounts.get(item.file) || 0) === 1) {
            acc.exclusive += item.size;
          }

          return acc;
        },
        { total: 0, exclusive: 0, js: 0, css: 0 }
      );

      return {
        route,
        fileCount: sizedFiles.length,
        ...summary
      };
    })
  );

  routeSummaries.sort((left, right) => right.total - left.total);

  const topRouteRows = routeSummaries.slice(0, top).map((summary) => [
    `\`${summary.route}\``,
    formatBytes(summary.total),
    formatBytes(summary.exclusive),
    formatBytes(summary.js),
    formatBytes(summary.css),
    String(summary.fileCount)
  ]);

  const sharedAssets = await Promise.all(
    Array.from(fileUseCounts.entries())
      .filter(([, count]) => count > 1)
      .map(async ([file, refs]) => ({
        file,
        refs,
        size: await readFileSize(file)
      }))
  );

  sharedAssets.sort((left, right) => right.size - left.size);

  const topSharedRows = sharedAssets.slice(0, top).map((asset) => [
    `\`${asset.file}\``,
    formatBytes(asset.size),
    String(asset.refs)
  ]);

  const reviewCandidates = routeSummaries.filter(
    (summary) => summary.total >= 250 * 1024 || summary.exclusive >= 80 * 1024
  );

  console.log("# 라우트 성능 리포트");
  console.log("");
  console.log(`총 ${routeSummaries.length}개의 페이지 라우트를 분석했습니다.`);
  console.log("");
  console.log("## 자산 무게가 큰 라우트");
  console.log("");
  console.log(
    renderTable(
      ["라우트", "총합", "전용 자산", "JS", "CSS", "파일 수"],
      topRouteRows
    )
  );
  console.log("");
  console.log("## 공유 자산 상위 목록");
  console.log("");
  console.log(renderTable(["자산", "크기", "참조 라우트 수"], topSharedRows));
  console.log("");
  console.log("## 검토 후보");
  console.log("");

  if (reviewCandidates.length === 0) {
    console.log("- 기본 임계값을 넘는 라우트가 없습니다.");
    return;
  }

  reviewCandidates.forEach((summary) => {
    console.log(
      `- \`${summary.route}\`: 총합 ${formatBytes(summary.total)}, 전용 자산 ${formatBytes(summary.exclusive)}`
    );
  });
}

await main();
