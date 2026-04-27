import type { GradeInputs, MockExamInputs } from "@/src/types/calculator";

export const SHEET_NAMES = {
  calculator: "계산기",
  scoreInput: "성적입력",
  comprehensivePlacement: "종합배치표",
  comprehensiveAdjustment: "종합보정값",
  schoolRecordPlacement: "교과배치표",
  schoolRecordAdjustment: "교과보정값",
  list: "목록",
  schoolDb: "고등학교DB",
} as const;

export const NAMED_RANGES = {
  provinces: "시도목록",
} as const;

export const ADMISSION_TYPES = {
  comprehensive: "학생부종합",
  schoolRecord: "학생부교과",
} as const;

export const JUDGMENTS = {
  upward: "상향",
  challenge: "소신",
  fit: "적정",
  safe: "안정",
} as const;

export const INPUT_METRIC_BY_REF: Record<string, keyof GradeInputs | keyof MockExamInputs> = {
  "성적입력!$C$13": "coreAll",
  "성적입력!$C$14": "coreAll",
  "성적입력!$C$15": "coreAll",
  "성적입력!$C$16": "coreAll",
  "성적입력!$C$17": "coreAll",
  "성적입력!$C$18": "coreAll",
  "성적입력!$C$19": "coreAll",
  "성적입력!$C$20": "coreAll",
  "성적입력!$F$13": "korean",
  "성적입력!$F$14": "calculus",
  "성적입력!$F$15": "statistics",
  "성적입력!$F$16": "english",
  "성적입력!$F$17": "history",
  "성적입력!$F$18": "social1",
  "성적입력!$F$19": "social2",
  "성적입력!$F$20": "science1",
  "성적입력!$F$21": "science2",
};

