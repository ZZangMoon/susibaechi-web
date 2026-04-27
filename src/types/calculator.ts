export type AdmissionType = "학생부종합" | "학생부교과";
export type BaseTrack = "인문" | "자연";
export type TrackType = BaseTrack | string;
export type PlacementTier = "A" | "B" | "C" | "D" | "E";
export type Judgment = "상향" | "소신" | "적정" | "안정" | "";

export interface RegionTree {
  provinces: string[];
  districtsByProvince: Record<string, string[]>;
  schoolsByProvinceDistrict: Record<string, string[]>;
}

export interface SchoolRecord {
  province: string;
  district: string;
  educationOffice: string | null;
  schoolType: string | null;
  schoolSubtype: string | null;
  specialOperation: string | null;
  schoolName: string;
  humanitiesTotal: number | null;
  naturalTotal: number | null;
  mockCategory: string | null;
  humanitiesTier: PlacementTier | "";
  naturalTier: PlacementTier | "";
  notes: string | null;
  founderType: string | null;
  coeducationType: string | null;
  openedAt: string | null;
}

export interface GradeInputs {
  coreSocial: number | null;
  coreScience: number | null;
  coreAll: number | null;
  korean: number | null;
  math: number | null;
  english: number | null;
  social: number | null;
  science: number | null;
}

export interface MockExamInputs {
  korean: number | null;
  calculus: number | null;
  statistics: number | null;
  english: number | null;
  history: number | null;
  social1: number | null;
  social2: number | null;
  science1: number | null;
  science2: number | null;
}

export interface StudentRecordInputs {
  academicCompetency: string;
  careerCompetency: string;
  communityCompetency: string;
  focusTrack: string;
}

export interface CalculatorInput {
  province: string;
  district: string;
  schoolName: string;
  studentRecord: StudentRecordInputs;
  grades: GradeInputs;
  mockExam: MockExamInputs;
}

export interface ThresholdSet {
  reach: number | null;
  fit: number | null;
  safe: number | null;
}

export interface PlacementTableRow {
  key: string;
  section: string;
  track: TrackType;
  thresholdsByTier: Record<PlacementTier, ThresholdSet>;
}

export interface TierBonusRule {
  tier: PlacementTier;
  humanities: number | null;
  natural: number | null;
  description: string | null;
}

export interface OffsetRule {
  tier: PlacementTier;
  reachOffset: number | null;
  safeOffset: number | null;
  description: string | null;
}

export interface AcademicGapRule {
  tier: PlacementTier;
  humanitiesGap: number | null;
  naturalGap: number | null;
  description: string | null;
}

export interface BaseThresholdRule {
  academicType: string;
  baseFitScore: number | null;
  track: TrackType | null;
}

export interface AdjustmentSection {
  name: string;
  sourceSheet: "종합보정값" | "교과보정값";
  tierBonuses: TierBonusRule[];
  offsets: OffsetRule[];
  academicGaps: AcademicGapRule[];
  baseThresholds: BaseThresholdRule[];
}

export interface AdmissionRecord {
  rowNumber: number;
  no: number | null;
  region: string | null;
  district: string | null;
  university: string | null;
  admissionType: AdmissionType;
  admissionName: string | null;
  recruitmentUnit: string | null;
  track: TrackType;
  detailTrack: string;
  quota: number | null;
  scoreRef: string | null;
  excelTier: PlacementTier | "";
  excelScore: number | null;
  excelJudgment: Judgment;
  excelThresholds: ThresholdSet;
}

export interface SheetRoleSummary {
  name: string;
  dimension: string;
  role: string;
  notes: string[];
}

export interface WorkbookSummary {
  sheetRoles: SheetRoleSummary[];
  dropdownRules: string[];
  formulaPatterns: string[];
}

export interface ValidationSample {
  label: string;
  admissionNo: number;
  university: string;
  admissionType: AdmissionType;
  detailTrack: string;
  expected: {
    tier: PlacementTier | "";
    score: number | null;
    thresholds: ThresholdSet;
    judgment: Judgment;
  };
}

export interface CalculatorDataset {
  workbookPath: string;
  exportedAt: string;
  defaultInput: CalculatorInput;
  workbookSummary: WorkbookSummary;
  regionTree: RegionTree;
  schools: SchoolRecord[];
  admissions: AdmissionRecord[];
  comprehensiveAdjustments: AdjustmentSection[];
  schoolRecordAdjustments: AdjustmentSection[];
  comprehensivePlacementTable: PlacementTableRow[];
  schoolRecordPlacementTable: PlacementTableRow[];
  validationSamples: ValidationSample[];
}

export interface CalculatedAdmissionRow extends AdmissionRecord {
  computedTier: PlacementTier | "";
  computedScore: number | null;
  computedThresholds: ThresholdSet;
  computedJudgment: Judgment;
}

