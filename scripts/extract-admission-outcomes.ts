import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const WORKBOOK_PATH = "C:/Users/xoans/OneDrive/Desktop/테스트.xlsx";
const SOURCE_SHEET_NAME = "입결검색기";
const OUTPUT_PATH = path.join(process.cwd(), "src/data/admission-outcomes.json");

type SchoolFilter = {
  sourceNames: string[];
  canonicalName: string;
  includeIfContains?: string[];
  excludeIfContains?: string[];
};

const TARGET_SCHOOLS: SchoolFilter[] = [
  { sourceNames: ["서울대"], canonicalName: "서울대학교" },
  { sourceNames: ["연세대"], canonicalName: "연세대학교" },
  { sourceNames: ["고려대"], canonicalName: "고려대학교", excludeIfContains: ["세종"] },
  { sourceNames: ["서강대"], canonicalName: "서강대학교" },
  { sourceNames: ["성균관대"], canonicalName: "성균관대학교" },
  { sourceNames: ["한양대"], canonicalName: "한양대학교", excludeIfContains: ["에리카", "ERICA"] },
  { sourceNames: ["중앙대"], canonicalName: "중앙대학교" },
  { sourceNames: ["경희대"], canonicalName: "경희대학교" },
  { sourceNames: ["서울시립대"], canonicalName: "서울시립대학교" },
  {
    sourceNames: ["한국외대", "한국외국어대"],
    canonicalName: "한국외국어대학교",
    includeIfContains: ["서울"],
    excludeIfContains: ["글로벌"],
  },
  { sourceNames: ["이화여대"], canonicalName: "이화여자대학교" },
  { sourceNames: ["건국대"], canonicalName: "건국대학교" },
  { sourceNames: ["동국대"], canonicalName: "동국대학교" },
  {
    sourceNames: ["홍익대"],
    canonicalName: "홍익대학교",
    excludeIfContains: ["세종"],
  },
  { sourceNames: ["숙명여대"], canonicalName: "숙명여자대학교" },
];

interface AdmissionOutcomeYearData {
  p50: number | null;
  p70: number | null;
  minimumRequirement: string | null;
}

interface AdmissionOutcomeEntry {
  sourceRowNumber: number;
  sourceUniversity: string;
  university: string;
  track: string | null;
  admissionGroup: string | null;
  admissionName: string;
  recruitmentUnit: string;
  year25: AdmissionOutcomeYearData;
  year24: AdmissionOutcomeYearData;
}

function toNullableNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toNullableText(value: unknown): string | null {
  const text = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return text ? text : null;
}

function normalizeUniversityName(rawUniversity: string): string | null {
  for (const school of TARGET_SCHOOLS) {
    const hasSourceName = school.sourceNames.some((name) => rawUniversity.includes(name));
    if (!hasSourceName) {
      continue;
    }

    if (
      school.includeIfContains &&
      !school.includeIfContains.every((token) => rawUniversity.includes(token))
    ) {
      continue;
    }

    if (school.excludeIfContains?.some((token) => rawUniversity.includes(token))) {
      continue;
    }

    return school.canonicalName;
  }

  return null;
}

function main() {
  if (!fs.existsSync(WORKBOOK_PATH)) {
    throw new Error(`Workbook not found: ${WORKBOOK_PATH}`);
  }

  const workbook = XLSX.readFile(WORKBOOK_PATH);
  const worksheet = workbook.Sheets[SOURCE_SHEET_NAME];

  if (!worksheet) {
    throw new Error(`Sheet not found: ${SOURCE_SHEET_NAME}`);
  }

  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  const bodyRows = rows.slice(7);
  const entries: AdmissionOutcomeEntry[] = [];

  for (let index = 0; index < bodyRows.length; index += 1) {
    const row = bodyRows[index];
    const rawUniversity = String(row[2] ?? "").trim();
    const university = normalizeUniversityName(rawUniversity);

    if (!university) {
      continue;
    }

    const admissionName = String(row[5] ?? "").trim();
    const recruitmentUnit = String(row[6] ?? "").trim();

    if (!admissionName || !recruitmentUnit) {
      continue;
    }

    entries.push({
      sourceRowNumber: index + 8,
      sourceUniversity: rawUniversity,
      university,
      track: toNullableText(row[3]),
      admissionGroup: toNullableText(row[4]),
      admissionName,
      recruitmentUnit,
      year25: {
        p50: toNullableNumber(row[13]),
        p70: toNullableNumber(row[12]),
        minimumRequirement: toNullableText(row[34]),
      },
      year24: {
        p50: toNullableNumber(row[19]),
        p70: toNullableNumber(row[18]),
        minimumRequirement: toNullableText(row[35]),
      },
    });
  }

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      {
        workbookPath: WORKBOOK_PATH,
        sourceSheetName: SOURCE_SHEET_NAME,
        exportedAt: new Date().toISOString(),
        count: entries.length,
        entries,
      },
      null,
      2,
    ),
  );

  const byUniversity = new Map<string, number>();
  for (const entry of entries) {
    byUniversity.set(entry.university, (byUniversity.get(entry.university) ?? 0) + 1);
  }

  console.log(`Wrote ${entries.length} entries to ${OUTPUT_PATH}`);
  for (const [university, count] of [...byUniversity.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "ko"),
  )) {
    console.log(`${university}: ${count}`);
  }
}

main();
