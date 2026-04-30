import fs from "node:fs";
import path from "node:path";

import XLSX, { type CellObject, type WorkBook, type WorkSheet } from "xlsx";

import {
  ADMISSION_TYPES,
  NAMED_RANGES,
  SHEET_NAMES,
} from "../src/lib/excel-constants";
import {
  buildValidationPayload,
  compareThresholds,
  getComprehensivePlacementRows,
  getSchoolRecordPlacementRows,
} from "../src/lib/calculation";
import type {
  AdjustmentSection,
  AdmissionRecord,
  CalculatorDataset,
  CalculatorInput,
  PlacementTableRow,
  PlacementTier,
  RegionTree,
  SchoolRecord,
  SheetRoleSummary,
  ValidationSample,
} from "../src/types/calculator";

const WORKBOOK_PATH =
  process.env.WORKBOOK_PATH ?? path.resolve(process.cwd(), "source-workbook.xlsx");
const OUTPUT_PATH =
  process.env.OUTPUT_PATH ??
  path.resolve(process.cwd(), "src/data/calculator-dataset.json");
const GROUP_WIDTH = 5;
const PLACEMENT_TIERS: PlacementTier[] = ["A", "B", "C", "D", "E"];

function readWorkbook(filePath: string): WorkBook {
  return XLSX.readFile(filePath, {
    cellFormula: true,
    cellNF: false,
    cellStyles: false,
    cellText: false,
  });
}

function getSheet(workbook: WorkBook, name: string): WorkSheet {
  const sheet = workbook.Sheets[name];
  if (!sheet) {
    throw new Error(`Sheet not found: ${name}`);
  }
  return sheet;
}

function decodeRange(sheet: WorkSheet) {
  const ref = sheet["!ref"];
  if (!ref) {
    throw new Error("Sheet range is missing.");
  }
  return XLSX.utils.decode_range(ref);
}

function valueAt(sheet: WorkSheet, ref: string): string | number | null {
  const cell = sheet[ref] as CellObject | undefined;
  if (!cell || cell.v === undefined || cell.v === null || cell.v === "") {
    return null;
  }
  return cell.v as string | number;
}

function stringAt(sheet: WorkSheet, ref: string): string | null {
  const value = valueAt(sheet, ref);
  if (value === null) {
    return null;
  }
  return String(value).trim();
}

function numberAt(sheet: WorkSheet, ref: string): number | null {
  const value = valueAt(sheet, ref);
  if (value === null) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formulaAt(sheet: WorkSheet, ref: string): string | null {
  const cell = sheet[ref] as CellObject | undefined;
  return cell?.f ?? null;
}

function column(index: number): string {
  return XLSX.utils.encode_col(index);
}

function parseNamedRangeRef(ref: string): string {
  const match = ref.match(/!(.+)$/);
  return match ? match[1] : ref;
}

function readRangeValues(sheet: WorkSheet, rangeRef: string): string[] {
  const range = XLSX.utils.decode_range(rangeRef);
  const values: string[] = [];

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const ref = XLSX.utils.encode_cell({ r: row, c: col });
      const value = stringAt(sheet, ref);
      if (value) {
        values.push(value);
      }
    }
  }

  return values;
}

function buildRegionTree(workbook: WorkBook): RegionTree {
  const sheet = getSheet(workbook, SHEET_NAMES.list);
  const names = workbook.Workbook?.Names ?? [];
  const nameMap = new Map<string, string>();

  for (const namedRange of names) {
    if (namedRange.Name && namedRange.Ref) {
      nameMap.set(namedRange.Name, parseNamedRangeRef(namedRange.Ref));
    }
  }

  const provinceRange = nameMap.get(NAMED_RANGES.provinces) ?? "$A$1:$A$17";
  const provinces = readRangeValues(sheet, provinceRange);
  const districtsByProvince: Record<string, string[]> = {};
  const schoolsByProvinceDistrict: Record<string, string[]> = {};

  for (const province of provinces) {
    const districtRange = nameMap.get(`R_${province}`);
    const districts = districtRange ? readRangeValues(sheet, districtRange) : [];
    districtsByProvince[province] = districts;

    for (const district of districts) {
      const schoolRange = nameMap.get(`S_${province}_${district}`);
      schoolsByProvinceDistrict[`${province}||${district}`] = schoolRange
        ? readRangeValues(sheet, schoolRange)
        : [];
    }
  }

  return {
    provinces,
    districtsByProvince,
    schoolsByProvinceDistrict,
  };
}

function extractDefaultInput(workbook: WorkBook): CalculatorInput {
  const sheet = getSheet(workbook, SHEET_NAMES.scoreInput);

  return {
    province: stringAt(sheet, "C5") ?? "",
    district: stringAt(sheet, "C6") ?? "",
    schoolName: stringAt(sheet, "C7") ?? "",
    studentRecord: {
      academicCompetency: stringAt(sheet, "F5") ?? "",
      careerCompetency: stringAt(sheet, "F6") ?? "",
      communityCompetency: stringAt(sheet, "F7") ?? "",
      focusTrack: stringAt(sheet, "F8") ?? "",
    },
    grades: {
      coreSocial: numberAt(sheet, "C13"),
      coreScience: numberAt(sheet, "C14"),
      coreAll: numberAt(sheet, "C15"),
      korean: numberAt(sheet, "C16"),
      math: numberAt(sheet, "C17"),
      english: numberAt(sheet, "C18"),
      social: numberAt(sheet, "C19"),
      science: numberAt(sheet, "C20"),
    },
    mockExam: {
      korean: numberAt(sheet, "F13"),
      calculus: numberAt(sheet, "F14"),
      statistics: numberAt(sheet, "F15"),
      english: numberAt(sheet, "F16"),
      history: numberAt(sheet, "F17"),
      social1: numberAt(sheet, "F18"),
      social2: numberAt(sheet, "F19"),
      science1: numberAt(sheet, "F20"),
      science2: numberAt(sheet, "F21"),
    },
  };
}

function toTier(value: string | null): PlacementTier | "" {
  if (!value) {
    return "";
  }

  const matched = value.match(/[A-E]/);
  return (matched?.[0] as PlacementTier | undefined) ?? "";
}

function extractSchools(workbook: WorkBook): SchoolRecord[] {
  const sheet = getSheet(workbook, SHEET_NAMES.schoolDb);
  const range = decodeRange(sheet);
  const rows: SchoolRecord[] = [];

  for (let row = 2; row <= range.e.r + 1; row += 1) {
    const schoolName = stringAt(sheet, `G${row}`);
    if (!schoolName) {
      continue;
    }

    rows.push({
      province: stringAt(sheet, `A${row}`) ?? "",
      district: stringAt(sheet, `B${row}`) ?? "",
      educationOffice: stringAt(sheet, `C${row}`),
      schoolType: stringAt(sheet, `D${row}`),
      schoolSubtype: stringAt(sheet, `E${row}`),
      specialOperation: stringAt(sheet, `F${row}`),
      schoolName,
      humanitiesTotal: numberAt(sheet, `H${row}`),
      naturalTotal: numberAt(sheet, `I${row}`),
      mockCategory: stringAt(sheet, `J${row}`),
      humanitiesTier: toTier(stringAt(sheet, `K${row}`)),
      naturalTier: toTier(stringAt(sheet, `L${row}`)),
      notes: stringAt(sheet, `M${row}`),
      founderType: stringAt(sheet, `N${row}`),
      coeducationType: stringAt(sheet, `O${row}`),
      openedAt: stringAt(sheet, `P${row}`),
    });
  }

  return rows;
}

function extractAdmissions(workbook: WorkBook): AdmissionRecord[] {
  const sheet = getSheet(workbook, SHEET_NAMES.calculator);
  const range = decodeRange(sheet);
  const rows: AdmissionRecord[] = [];
  const admissionTypes = new Set<string>([ADMISSION_TYPES.comprehensive, ADMISSION_TYPES.schoolRecord]);

  for (let row = 5; row <= range.e.r + 1; row += 1) {
    const admissionType = stringAt(sheet, `F${row}`);
    const detailTrack = stringAt(sheet, `J${row}`) ?? "";
    const university = stringAt(sheet, `E${row}`);

    if (!admissionType || !admissionTypes.has(admissionType) || !university) {
      continue;
    }

    rows.push({
      rowNumber: row,
      no: numberAt(sheet, `B${row}`),
      region: stringAt(sheet, `C${row}`),
      district: stringAt(sheet, `D${row}`),
      university,
      admissionType: admissionType as AdmissionRecord["admissionType"],
      admissionName: stringAt(sheet, `G${row}`),
      recruitmentUnit: stringAt(sheet, `H${row}`),
      track: stringAt(sheet, `I${row}`) ?? "",
      detailTrack,
      quota: numberAt(sheet, `K${row}`),
      scoreRef: formulaAt(sheet, `N${row}`),
      excelTier: toTier(stringAt(sheet, `M${row}`)),
      excelScore: numberAt(sheet, `N${row}`),
      excelJudgment: (stringAt(sheet, `P${row}`) ?? "") as AdmissionRecord["excelJudgment"],
      excelThresholds: {
        reach: numberAt(sheet, `R${row}`),
        fit: numberAt(sheet, `S${row}`),
        safe: numberAt(sheet, `T${row}`),
      },
    });
  }

  return rows;
}

function createThresholdSet(sheet: WorkSheet, row: number) {
  return {
    A: { reach: numberAt(sheet, `C${row}`), fit: numberAt(sheet, `D${row}`), safe: numberAt(sheet, `E${row}`) },
    B: { reach: numberAt(sheet, `F${row}`), fit: numberAt(sheet, `G${row}`), safe: numberAt(sheet, `H${row}`) },
    C: { reach: numberAt(sheet, `I${row}`), fit: numberAt(sheet, `J${row}`), safe: numberAt(sheet, `K${row}`) },
    D: { reach: numberAt(sheet, `L${row}`), fit: numberAt(sheet, `M${row}`), safe: numberAt(sheet, `N${row}`) },
    E: { reach: numberAt(sheet, `O${row}`), fit: numberAt(sheet, `P${row}`), safe: numberAt(sheet, `Q${row}`) },
  };
}

function hasThresholds(sheet: WorkSheet, row: number): boolean {
  return ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q"].some(
    (col) => numberAt(sheet, `${col}${row}`) !== null,
  );
}

function extractPlacementTable(
  workbook: WorkBook,
  sheetName: typeof SHEET_NAMES.comprehensivePlacement | typeof SHEET_NAMES.schoolRecordPlacement,
): PlacementTableRow[] {
  const sheet = getSheet(workbook, sheetName);
  const range = decodeRange(sheet);
  const rows: PlacementTableRow[] = [];
  let currentSection = "";

  for (let row = 1; row <= range.e.r + 1; row += 1) {
    const key = stringAt(sheet, `B${row}`);
    if (!key) {
      continue;
    }

    if (!hasThresholds(sheet, row)) {
      currentSection = key;
      continue;
    }

    rows.push({
      key,
      section: currentSection,
      track: key.includes("자연") ? "자연" : "인문",
      thresholdsByTier: createThresholdSet(sheet, row),
    });
  }

  return rows;
}

function tierFromLabel(value: string | null): PlacementTier | null {
  if (!value) {
    return null;
  }
  const matched = value.match(/[A-E]/);
  return matched ? (matched[0] as PlacementTier) : null;
}

function extractAdjustmentSections(
  workbook: WorkBook,
  sheetName: typeof SHEET_NAMES.comprehensiveAdjustment | typeof SHEET_NAMES.schoolRecordAdjustment,
): AdjustmentSection[] {
  const sheet = getSheet(workbook, sheetName);
  const range = decodeRange(sheet);
  const sections: AdjustmentSection[] = [];

  for (let startCol = 1; startCol <= range.e.c; startCol += GROUP_WIDTH) {
    const baseCol = column(startCol);
    const valueCol1 = column(startCol + 1);
    const valueCol2 = column(startCol + 2);
    const textCol = column(startCol + 3);

    const name = stringAt(sheet, `${baseCol}2`);
    if (!name) {
      continue;
    }

    const tierBonuses = Array.from({ length: 5 }, (_, index) => {
      const row = 6 + index;
      const tier = tierFromLabel(stringAt(sheet, `${baseCol}${row}`));
      if (!tier) {
        return null;
      }
      return {
        tier,
        humanities: numberAt(sheet, `${valueCol1}${row}`),
        natural: numberAt(sheet, `${valueCol2}${row}`),
        description: stringAt(sheet, `${textCol}${row}`),
      };
    }).filter(Boolean) as AdjustmentSection["tierBonuses"];

    const offsets = Array.from({ length: 5 }, (_, index) => {
      const row = 14 + index;
      const tier = tierFromLabel(stringAt(sheet, `${baseCol}${row}`));
      if (!tier) {
        return null;
      }
      return {
        tier,
        reachOffset: numberAt(sheet, `${valueCol1}${row}`),
        safeOffset: numberAt(sheet, `${valueCol2}${row}`),
        description: stringAt(sheet, `${textCol}${row}`),
      };
    }).filter(Boolean) as AdjustmentSection["offsets"];

    const baseThresholds = [];
    for (let row = 22; row <= range.e.r + 1; row += 1) {
      const academicType = stringAt(sheet, `${baseCol}${row}`);
      if (!academicType) {
        continue;
      }
      if (academicType.startsWith("티어") || academicType === "계열" || academicType.endsWith("티어")) {
        continue;
      }

      baseThresholds.push({
        academicType,
        baseFitScore: numberAt(sheet, `${valueCol1}${row}`),
        track: stringAt(sheet, `${textCol}${row}`),
      });
    }

    const academicGaps = Array.from({ length: 5 }, (_, index) => {
      const row = 35 + index;
      const tier = tierFromLabel(stringAt(sheet, `${baseCol}${row}`));
      if (!tier) {
        return null;
      }
      return {
        tier,
        humanitiesGap: numberAt(sheet, `${valueCol1}${row}`),
        naturalGap: numberAt(sheet, `${valueCol2}${row}`),
        description: stringAt(sheet, `${textCol}${row}`),
      };
    }).filter(Boolean) as AdjustmentSection["academicGaps"];

    sections.push({
      name,
      sourceSheet: sheetName,
      tierBonuses,
      offsets,
      academicGaps,
      baseThresholds,
    });
  }

  return sections;
}

function buildWorkbookSummary(workbook: WorkBook) {
  const sheetRoles: SheetRoleSummary[] = [
    {
      name: SHEET_NAMES.scoreInput,
      dimension: getSheet(workbook, SHEET_NAMES.scoreInput)["!ref"] ?? "",
      role: "입력용 시트",
      notes: [
        "학교 선택과 내신/모의고사 입력을 받는 메인 입력 시트입니다.",
        "C8/C9는 고등학교DB를 INDEX/MATCH로 조회해 인문/자연 티어를 자동 계산합니다.",
        "C5, C6, C7은 이름정의와 INDIRECT 기반 종속 드롭다운을 사용합니다.",
      ],
    },
    {
      name: SHEET_NAMES.calculator,
      dimension: getSheet(workbook, SHEET_NAMES.calculator)["!ref"] ?? "",
      role: "출력용 시트",
      notes: [
        "대학/전형/모집단위 원본 테이블과 계산 결과가 함께 놓인 최종 결과 시트입니다.",
        "M열 티어, N열 점수, R/S/T열 컷, P열 판정을 시트 간 참조와 비교식으로 계산합니다.",
        "현재 확인된 기본 데이터 기준으로 N열은 모두 성적입력!C15를 참조합니다.",
      ],
    },
    {
      name: SHEET_NAMES.comprehensivePlacement,
      dimension: getSheet(workbook, SHEET_NAMES.comprehensivePlacement)["!ref"] ?? "",
      role: "학생부종합 기준표",
      notes: [
        "상세계열별 A~E 티어의 상향/적정/안정 컷이 정리된 결과표입니다.",
        "실제 웹앱은 이 시트를 직접 읽기보다 종합보정값에서 동일 표를 재생성합니다.",
      ],
    },
    {
      name: SHEET_NAMES.comprehensiveAdjustment,
      dimension: getSheet(workbook, SHEET_NAMES.comprehensiveAdjustment)["!ref"] ?? "",
      role: "학생부종합 보정 규칙표",
      notes: [
        "티어 가감점, 상향/안정 offset, 인문1·3/자연1·3 gap 규칙, C 적정 기준값이 들어 있습니다.",
        "웹앱 배치표 재구성의 핵심 원본입니다.",
      ],
    },
    {
      name: SHEET_NAMES.schoolRecordPlacement,
      dimension: getSheet(workbook, SHEET_NAMES.schoolRecordPlacement)["!ref"] ?? "",
      role: "학생부교과 기준표",
      notes: [
        "교과 전형용 A~E 티어 컷 테이블입니다.",
        "구조는 종합배치표와 유사하지만 교과보정값 규칙으로 재생성됩니다.",
      ],
    },
    {
      name: SHEET_NAMES.schoolRecordAdjustment,
      dimension: getSheet(workbook, SHEET_NAMES.schoolRecordAdjustment)["!ref"] ?? "",
      role: "학생부교과 보정 규칙표",
      notes: [
        "교과 전형용 티어 가감점, offset, 기준값이 모여 있는 보정 시트입니다.",
        "종합보정값과 패턴은 유사하지만 수치가 다릅니다.",
      ],
    },
    {
      name: SHEET_NAMES.list,
      dimension: getSheet(workbook, SHEET_NAMES.list)["!ref"] ?? "",
      role: "드롭다운 원본 시트",
      notes: [
        "시도/행정구/학교명 목록을 이름정의 범위로 제공합니다.",
        "웹앱에서는 regionTree 구조로 정규화해 상태 기반 종속 드롭다운으로 치환했습니다.",
      ],
    },
    {
      name: SHEET_NAMES.schoolDb,
      dimension: getSheet(workbook, SHEET_NAMES.schoolDb)["!ref"] ?? "",
      role: "학교 기준 데이터",
      notes: [
        "학교별 인문/자연 총점과 티어가 저장되어 있습니다.",
        "성적입력 시트에서 학교 선택 시 INDEX/MATCH로 참조됩니다.",
      ],
    },
  ];

  return {
    sheetRoles,
    dropdownRules: [
      "성적입력!C5는 이름정의 시도목록을 사용합니다.",
      "성적입력!C6는 INDIRECT(\"R_\"&C5)로 행정구 목록을 바꿉니다.",
      "성적입력!C7은 INDIRECT(\"S_\"&C5&\"_\"&C6)로 학교 목록을 바꿉니다.",
      "웹앱에서는 동일 규칙을 regionTree와 React state로 재작성했습니다.",
    ],
    formulaPatterns: [
      "학교 티어 조회: IFERROR(INDEX/MATCH(...), \"\")",
      "컷 조회: IFERROR(INDEX(배치표범위, MATCH(상세계열), MATCH(티어)), \"\")",
      "판정 계산: IF(score<=안정, 안정, IF(score<=적정, 적정, IF(score<=상향, 도전, 상향)))",
      "배치표 재구성: 기준 fit + 티어 가감 + 인문1/3·자연1/3 gap + reach/safe offset",
    ],
  };
}

function chooseValidationSamples(dataset: CalculatorDataset): ValidationSample[] {
  const rows = buildValidationPayload(dataset);
  const selectors = [
    (row: AdmissionRecord) => row.admissionType === ADMISSION_TYPES.comprehensive && row.track === "인문" && !!row.excelJudgment,
    (row: AdmissionRecord) => row.admissionType === ADMISSION_TYPES.comprehensive && row.track === "자연" && !!row.excelJudgment,
    (row: AdmissionRecord) => row.admissionType === ADMISSION_TYPES.schoolRecord && row.track === "인문" && !!row.excelJudgment,
    (row: AdmissionRecord) => row.admissionType === ADMISSION_TYPES.schoolRecord && row.track === "자연" && !!row.excelJudgment,
    (row: AdmissionRecord) => row.detailTrack.endsWith("3") && !!row.excelJudgment,
  ];

  const samples: ValidationSample[] = [];
  const seen = new Set<number>();

  for (const selector of selectors) {
    const row = rows.find(
      (candidate) => candidate.no !== null && !seen.has(candidate.no) && selector(candidate),
    );

    if (!row || row.no === null) {
      continue;
    }

    seen.add(row.no);
    samples.push({
      label: `${row.university ?? "대학"} ${row.recruitmentUnit ?? row.detailTrack}`,
      admissionNo: row.no,
      university: row.university ?? "",
      admissionType: row.admissionType,
      detailTrack: row.detailTrack,
      expected: {
        tier: row.excelTier,
        score: row.excelScore,
        thresholds: row.excelThresholds,
        judgment: row.excelJudgment,
      },
    });
  }

  return samples;
}

function validatePlacementReconstruction(
  generated: PlacementTableRow[],
  expected: PlacementTableRow[],
) {
  const generatedMap = new Map(generated.map((row) => [row.key, row] as const));
  const mismatches = expected.filter((row) => {
    const candidate = generatedMap.get(row.key);
    if (!candidate) {
      return true;
    }

    return PLACEMENT_TIERS.some(
      (tier) => !compareThresholds(candidate.thresholdsByTier[tier], row.thresholdsByTier[tier]),
    );
  });

  return {
    compared: expected.length,
    mismatches: mismatches.length,
  };
}

function main() {
  const workbook = readWorkbook(WORKBOOK_PATH);

  const datasetBase: Omit<CalculatorDataset, "validationSamples"> = {
    workbookPath: WORKBOOK_PATH,
    exportedAt: new Date().toISOString(),
    defaultInput: extractDefaultInput(workbook),
    workbookSummary: buildWorkbookSummary(workbook),
    regionTree: buildRegionTree(workbook),
    schools: extractSchools(workbook),
    admissions: extractAdmissions(workbook),
    comprehensiveAdjustments: extractAdjustmentSections(workbook, SHEET_NAMES.comprehensiveAdjustment),
    schoolRecordAdjustments: extractAdjustmentSections(workbook, SHEET_NAMES.schoolRecordAdjustment),
    comprehensivePlacementTable: extractPlacementTable(workbook, SHEET_NAMES.comprehensivePlacement),
    schoolRecordPlacementTable: extractPlacementTable(workbook, SHEET_NAMES.schoolRecordPlacement),
  };

  const dataset: CalculatorDataset = {
    ...datasetBase,
    validationSamples: [],
  };

  const comprehensiveValidation = validatePlacementReconstruction(
    getComprehensivePlacementRows(dataset),
    dataset.comprehensivePlacementTable,
  );
  const schoolRecordValidation = validatePlacementReconstruction(
    getSchoolRecordPlacementRows(dataset),
    dataset.schoolRecordPlacementTable,
  );

  dataset.validationSamples = chooseValidationSamples(dataset);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dataset, null, 2), "utf8");

  console.log(`Saved dataset to ${OUTPUT_PATH}`);
  console.log(
    `Placement validation: 종합 ${comprehensiveValidation.compared}건 중 ${comprehensiveValidation.mismatches}건 불일치, 교과 ${schoolRecordValidation.compared}건 중 ${schoolRecordValidation.mismatches}건 불일치`,
  );
}

main();

