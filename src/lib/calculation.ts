import {
  ADMISSION_TYPES,
  INPUT_METRIC_BY_REF,
  JUDGMENTS,
} from "@/src/lib/excel-constants";
import type {
  AdjustmentSection,
  AdmissionRecord,
  BaseTrack,
  CalculatedAdmissionRow,
  CalculatorDataset,
  CalculatorInput,
  Judgment,
  PlacementTableRow,
  PlacementTier,
  SchoolRecord,
  ThresholdSet,
  TrackType,
} from "@/src/types/calculator";

const TIER_ORDER: PlacementTier[] = ["A", "B", "C", "D", "E"];
const NUMBER_EPSILON = 1e-9;
const comprehensivePlacementCache = new WeakMap<CalculatorDataset, PlacementTableRow[]>();
const schoolRecordPlacementCache = new WeakMap<CalculatorDataset, PlacementTableRow[]>();
const DETAIL_TRACK_SPECIAL_SUFFIXES = ["자전인문", "자전자연", "자전공통", "사범"] as const;

interface DetailTrackConfig {
  prefixes: Array<{
    admissionType?: AdmissionRecord["admissionType"];
    admissionNameIncludes: string[];
    prefix: string;
  }>;
  firstKeywordsHumanities?: string[];
  thirdKeywordsHumanities?: string[];
  firstKeywordsNatural?: string[];
  thirdKeywordsNatural?: string[];
  defaultHumanitiesBucket?: "1" | "2" | "3";
  defaultNaturalBucket?: "1" | "2" | "3";
  specialCase?: (
    admission: AdmissionRecord,
    prefix: string,
    placementKeys: Set<string>,
  ) => string | null;
}

const DETAIL_TRACK_DISPLAY_ALIASES: Record<string, string> = {
  기타5: "경희일반",
};

const DETAIL_TRACK_SEARCH_ALIASES: Record<string, string[]> = {
  서울일반: ["서울대학교", "서울대"],
  서울지균: ["서울대학교", "서울대"],
  연세활동: ["연세대학교", "연세대"],
  연세국제: ["연세대학교", "연세대"],
  연세교과: ["연세대학교", "연세대"],
  고려학업: ["고려대학교", "고려대"],
  고려계열: ["고려대학교", "고려대"],
  고려교과: ["고려대학교", "고려대"],
  성균융합: ["성균관대학교", "성균대"],
  성균탐구: ["성균관대학교", "성균대"],
  성균과학: ["성균관대학교", "성균대"],
  성균교과: ["성균관대학교", "성균대"],
  서강일반1: ["서강대학교", "서강대"],
  서강일반2: ["서강대학교", "서강대"],
  서강교과: ["서강대학교", "서강대"],
  한양추천: ["한양대학교", "한양대"],
  한양서류: ["한양대학교", "한양대"],
  한양면접: ["한양대학교", "한양대"],
  한양교과: ["한양대학교", "한양대"],
  중앙교과: ["중앙대학교", "중앙대"],
  시립종합: ["서울시립대학교", "시립대"],
  시립교과: ["서울시립대학교", "시립대"],
  외대교과: ["한국외국어대학교", "외국어대", "한국외대", "외대"],
  외대면접: ["한국외국어대학교", "외국어대", "한국외대", "외대"],
  외대서류: ["한국외국어대학교", "외국어대", "한국외대", "외대"],
  경희교과: ["경희대학교", "경희대", "경희일반"],
  기타5: ["경희대학교", "경희대", "경희일반"],
  건국교과: ["건국대학교", "건국대", "건대"],
  건국종합: ["건국대학교", "건국대", "건대"],
  동국교과: ["동국대학교", "동국대"],
  동국종합: ["동국대학교", "동국대"],
  홍익교과: ["홍익대학교", "홍익대", "홍대"],
  홍익종합: ["홍익대학교", "홍익대", "홍대"],
  숙명교과: ["숙명여자대학교", "숙명여대", "숙대"],
  숙명종합: ["숙명여자대학교", "숙명여대", "숙대"],
};

const DETAIL_TRACK_CONFIGS: Record<string, DetailTrackConfig> = {
  서울대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["지역균형선발"], prefix: "서울지균" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["일반전형"], prefix: "서울일반" },
    ],
    firstKeywordsHumanities: ["경영", "경제", "자유전공", "정치외교", "사회과학", "언론정보"],
    thirdKeywordsHumanities: ["국어국문", "중어중문", "불어불문", "독어독문", "철학", "고고미술", "역사"],
    firstKeywordsNatural: ["의예", "컴퓨터", "전기정보", "산업공학", "화학생물공학", "재료공학", "기계공학", "수리과학", "통계학"],
    thirdKeywordsNatural: ["건축", "조경", "지구환경", "식물생산", "산림", "응용생물"],
    defaultHumanitiesBucket: "1",
    defaultNaturalBucket: "1",
  },
  고려대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["학교추천"], prefix: "고려교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["학업우수"], prefix: "고려학업" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["계열적합", "사이버국방"], prefix: "고려계열" },
    ],
    firstKeywordsHumanities: ["경영", "경제", "정치외교", "행정", "미디어", "심리"],
    thirdKeywordsHumanities: ["국어국문", "영어영문", "독어독문", "노어노문", "철학", "사학", "한문"],
    firstKeywordsNatural: ["의과", "컴퓨터", "전기전자", "반도체", "데이터", "산업경영공학", "생명공학", "화공생명공학"],
    thirdKeywordsNatural: ["건축", "건축사회환경", "지구환경", "간호", "수학교육"],
    defaultHumanitiesBucket: "1",
    defaultNaturalBucket: "1",
  },
  성균관대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["학교장추천"], prefix: "성균교과" },
      { admissionNameIncludes: ["융합형"], prefix: "성균융합" },
      { admissionNameIncludes: ["탐구형"], prefix: "성균탐구" },
      { admissionNameIncludes: ["과학인재"], prefix: "성균과학" },
      { admissionNameIncludes: ["성균인재"], prefix: "성균융합" },
    ],
    firstKeywordsHumanities: ["경영", "경제", "글로벌경영", "글로벌경제", "글로벌리더", "사회과학계열", "글로벌융합"],
    thirdKeywordsHumanities: ["국어국문", "독어독문", "러시아어", "사학", "철학", "한문", "교육학", "수학교육", "문학", "유학"],
    firstKeywordsNatural: ["반도체", "소프트웨어", "컴퓨터", "전자", "배터리", "바이오", "양자", "수학", "물리", "화학", "약학"],
    thirdKeywordsNatural: ["건설환경", "건축", "토목"],
  },
  서강대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["지역균형"], prefix: "서강교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["일반전형"], prefix: "서강일반1" },
    ],
    firstKeywordsHumanities: ["경영", "경제", "게페르트국제", "글로벌한국", "미디어&엔터테인먼트", "아트&테크놀로지", "지식융합미디어", "심리"],
    thirdKeywordsHumanities: ["종교", "철학", "사학", "영미어문", "국어국문"],
    firstKeywordsNatural: ["인공지능", "컴퓨터", "전자", "수학", "화공생명", "기계"],
    thirdKeywordsNatural: ["물리", "화학", "생명", "건축"],
    defaultHumanitiesBucket: "2",
    defaultNaturalBucket: "2",
    specialCase: inferCommonSpecialTrack,
  },
  한양대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["추천형"], prefix: "한양교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["추천형"], prefix: "한양추천" },
      { admissionNameIncludes: ["서류형"], prefix: "한양서류" },
      { admissionNameIncludes: ["면접형"], prefix: "한양면접" },
    ],
    firstKeywordsHumanities: ["경영", "경제금융", "파이낸스", "국제", "미디어", "정책", "관광"],
    thirdKeywordsHumanities: ["국어국문", "독어독문", "사학", "철학", "교육", "국어교육", "영어교육"],
    firstKeywordsNatural: ["반도체", "인공지능", "컴퓨터", "전자", "데이터", "미래자동차", "기계", "생명공학"],
    thirdKeywordsNatural: ["건설환경", "건축", "도시", "자원환경", "교통"],
  },
  중앙대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["지역균형"], prefix: "중앙교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["CAU융합형인재"], prefix: "중앙교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["CAU탐구형인재"], prefix: "중앙교과" },
    ],
    firstKeywordsHumanities: ["경영", "경제", "광고홍보", "공공인재", "국어국문", "심리"],
    thirdKeywordsHumanities: ["철학", "역사", "유럽문화", "아시아문화", "사회복지"],
    firstKeywordsNatural: ["간호", "소프트웨어", "AI", "첨단소재", "전자전기", "기계", "생명공학"],
    thirdKeywordsNatural: ["건축", "건설환경플랜트", "화학", "물리", "수학"],
    defaultHumanitiesBucket: "2",
    defaultNaturalBucket: "2",
    specialCase: inferCommonSpecialTrack,
  },
  서울시립대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["지역균형"], prefix: "시립교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["학생부종합전형"], prefix: "시립종합" },
    ],
    firstKeywordsHumanities: ["세무", "경영", "경제", "행정", "국제관계"],
    thirdKeywordsHumanities: ["국어국문", "국사", "철학", "중국어문화"],
    firstKeywordsNatural: ["인공지능", "지능형반도체", "첨단인공지능", "전자전기컴퓨터", "컴퓨터", "융합바이오헬스"],
    thirdKeywordsNatural: ["건축", "공간정보", "교통", "도시공학", "조경"],
    specialCase: inferSirimSpecialTrack,
  },
  건국대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["KU지역균형"], prefix: "건국교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["KU자기추천"], prefix: "건국종합" },
    ],
    firstKeywordsHumanities: ["경영", "경제", "부동산", "정치외교", "미디어", "응용통계"],
    thirdKeywordsHumanities: ["국어국문", "영어영문", "철학", "사학", "교육"],
    firstKeywordsNatural: ["수의", "컴퓨터", "인공지능", "전자", "화학공학", "생명", "융합과학"],
    thirdKeywordsNatural: ["건축", "사회환경", "토목", "산림"],
  },
  경희대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["지역균형"], prefix: "경희교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["네오르네상스"], prefix: "기타5" },
    ],
    firstKeywordsHumanities: ["경영", "경제", "회계", "미디어", "관광", "무역"],
    thirdKeywordsHumanities: ["국어국문", "사학", "철학", "교육", "한국어"],
    firstKeywordsNatural: ["의예", "치의예", "한의예", "약학", "컴퓨터", "전자", "기계"],
    thirdKeywordsNatural: ["건축", "환경", "토목", "원예"],
    defaultHumanitiesBucket: "1",
    defaultNaturalBucket: "1",
  },
  동국대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["학교장추천"], prefix: "동국교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["Do Dream"], prefix: "동국종합" },
    ],
    firstKeywordsHumanities: ["경영", "경제", "광고홍보", "미디어", "경찰행정"],
    thirdKeywordsHumanities: ["국어국문", "사학", "철학", "교육"],
    firstKeywordsNatural: ["약학", "컴퓨터", "전자", "멀티미디어", "바이오", "화공"],
    thirdKeywordsNatural: ["건축", "토목", "환경"],
  },
  숙명여자대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["지역균형선발"], prefix: "숙명교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["숙명인재", "소프트웨어인재"], prefix: "숙명종합" },
    ],
    firstKeywordsHumanities: ["경영", "경제", "미디어", "홍보광고", "앙트러프러너십"],
    thirdKeywordsHumanities: ["국어국문", "사학", "철학", "교육"],
    firstKeywordsNatural: ["약학", "소프트웨어", "컴퓨터", "인공지능", "전자", "화공", "생명"],
    thirdKeywordsNatural: ["건축", "환경", "수학"],
  },
  연세대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["추천형"], prefix: "연세교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["국제형"], prefix: "연세국제" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["활동우수형"], prefix: "연세활동" },
    ],
    firstKeywordsHumanities: ["경영", "경제", "응용통계", "정치외교", "행정", "언론홍보"],
    thirdKeywordsHumanities: ["국어국문", "사학", "철학", "교육"],
    firstKeywordsNatural: ["의예", "치의예", "약학", "컴퓨터", "인공지능", "전기전자", "시스템반도체", "생명"],
    thirdKeywordsNatural: ["건축", "도시", "사회환경"],
    defaultHumanitiesBucket: "1",
    defaultNaturalBucket: "1",
  },
  한국외국어대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["학교장추천"], prefix: "외대교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["면접형"], prefix: "외대면접" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["서류형", "SW인재"], prefix: "외대서류" },
    ],
    firstKeywordsHumanities: ["LD", "LT", "국제", "경영", "경제", "미디어", "통번역"],
    thirdKeywordsHumanities: ["독일어", "프랑스어", "스페인어", "러시아어", "사학", "철학"],
    firstKeywordsNatural: ["컴퓨터", "AI", "인공지능", "전자", "수학", "통계"],
    thirdKeywordsNatural: ["환경", "생명"],
  },
  홍익대학교: {
    prefixes: [
      { admissionType: ADMISSION_TYPES.schoolRecord, admissionNameIncludes: ["학교장추천"], prefix: "홍익교과" },
      { admissionType: ADMISSION_TYPES.comprehensive, admissionNameIncludes: ["학교생활우수자"], prefix: "홍익종합" },
    ],
    firstKeywordsHumanities: ["경영", "경제", "광고홍보", "법", "영어영문"],
    thirdKeywordsHumanities: ["국어국문", "독어독문", "불어불문", "철학", "예술학"],
    firstKeywordsNatural: ["컴퓨터", "소프트웨어", "인공지능", "전자", "기계", "산업데이터"],
    thirdKeywordsNatural: ["건축", "도시", "토목", "목조형가구"],
  },
};

function containsAny(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

function normalizeUniversityToken(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll(" ", "")
    .replace("(ERICA)", "")
    .replace("대학교", "")
    .replace("대학", "")
    .replace("여자", "여")
    .toLowerCase();
}

function normalizeAdmissionNameToken(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll(" ", "")
    .replaceAll("전형", "")
    .replaceAll("학생부", "")
    .replaceAll("종합", "")
    .replaceAll("교과", "")
    .toLowerCase();
}

function startsWithAny(value: string, prefixes: string[]) {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

function resolveAdmissionPrefixRule(
  admission: AdmissionRecord,
  config: DetailTrackConfig,
) {
  const admissionName = admission.admissionName ?? "";

  return config.prefixes.find((rule) => {
    if (rule.admissionType && rule.admissionType !== admission.admissionType) {
      return false;
    }

    return rule.admissionNameIncludes.some((keyword) => admissionName.includes(keyword));
  });
}

function getDisplayAliasPrefix(prefix: string) {
  return DETAIL_TRACK_DISPLAY_ALIASES[prefix] ?? prefix;
}

function getRawPrefixFromDisplayAlias(prefix: string) {
  const matched = Object.entries(DETAIL_TRACK_DISPLAY_ALIASES).find(([, alias]) => alias === prefix);
  return matched?.[0] ?? prefix;
}

export function getExpectedDetailTrackPrefixes(admission: AdmissionRecord): string[] {
  const config = DETAIL_TRACK_CONFIGS[admission.university ?? ""];
  if (!config) {
    return [];
  }

  const prefixRule = resolveAdmissionPrefixRule(admission, config);
  if (!prefixRule) {
    return [];
  }

  const rawPrefix = prefixRule.prefix;
  const displayPrefix = getDisplayAliasPrefix(rawPrefix);
  return rawPrefix === displayPrefix ? [rawPrefix] : [rawPrefix, displayPrefix];
}

export function formatDetailTrackLabel(detailTrack: string) {
  let formatted = detailTrack;

  for (const [rawPrefix, displayPrefix] of Object.entries(DETAIL_TRACK_DISPLAY_ALIASES)) {
    if (formatted.startsWith(rawPrefix)) {
      formatted = displayPrefix + formatted.slice(rawPrefix.length);
      break;
    }
  }

  return formatted;
}

function extractDetailTrackPrefix(detailTrack: string) {
  const suffixes = ["인문1", "인문2", "인문3", "자연1", "자연2", "자연3", "사범", "자전인문", "자전자연", "자전공통"];
  const matchedSuffix = suffixes.find((suffix) => detailTrack.endsWith(suffix));
  return matchedSuffix ? detailTrack.slice(0, -matchedSuffix.length) : detailTrack;
}

export function getPlacementSearchText(row: PlacementTableRow) {
  const prefix = extractDetailTrackPrefix(row.key);
  const aliasTokens = DETAIL_TRACK_SEARCH_ALIASES[prefix] ?? [];

  return [
    row.key,
    formatDetailTrackLabel(row.key),
    row.section,
    String(row.track),
    ...aliasTokens,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterPlacementRowsForAdmission(
  admission: AdmissionRecord,
  options: PlacementTableRow[],
): PlacementTableRow[] {
  const expectedPrefixes = getExpectedDetailTrackPrefixes(admission).flatMap((prefix) => [
    prefix,
    getRawPrefixFromDisplayAlias(prefix),
  ]);

  if (expectedPrefixes.length > 0) {
    const matched = options.filter((option) => startsWithAny(option.key, expectedPrefixes));
    if (matched.length > 0) {
      return matched;
    }
  }

  const universityToken = normalizeUniversityToken(admission.university);
  const admissionNameToken = normalizeAdmissionNameToken(admission.admissionName);

  if (!universityToken) {
    return options;
  }

  const universityMatched = options.filter((option) => {
    const optionKey = normalizeUniversityToken(option.key);
    return optionKey.includes(universityToken) || universityToken.includes(optionKey);
  });

  if (!admissionNameToken) {
    return universityMatched.length > 0 ? universityMatched : options;
  }

  const universityAndAdmissionMatched = universityMatched.filter((option) => {
    const optionKey = normalizeAdmissionNameToken(option.key);
    const optionSection = normalizeAdmissionNameToken(option.section);
    return (
      optionKey.includes(admissionNameToken) ||
      admissionNameToken.includes(optionKey) ||
      optionSection.includes(admissionNameToken) ||
      admissionNameToken.includes(optionSection)
    );
  });

  if (universityAndAdmissionMatched.length > 0) {
    return universityAndAdmissionMatched;
  }

  return universityMatched.length > 0 ? universityMatched : options;
}

function inferSirimSpecialTrack(
  admission: AdmissionRecord,
  prefix: string,
  placementKeys: Set<string>,
): string | null {
  const recruitmentUnit = admission.recruitmentUnit ?? "";

  if (recruitmentUnit.includes("자유전공학부(인문)")) {
    return `${prefix}자전인문`;
  }
  if (recruitmentUnit.includes("자유전공학부(자연)")) {
    return `${prefix}자전자연`;
  }
  if (recruitmentUnit.includes("자유전공학부")) {
    return `${prefix}자전공통`;
  }
  if (containsAny(recruitmentUnit, ["교육", "사범"]) && placementKeys.has(`${prefix}사범`)) {
    return `${prefix}사범`;
  }

  return null;
}

function inferCommonSpecialTrack(
  admission: AdmissionRecord,
  prefix: string,
  placementKeys: Set<string>,
): string | null {
  const recruitmentUnit = admission.recruitmentUnit ?? "";
  const normalizedTrack = normalizeTrackForDetailTrack(admission.track, recruitmentUnit);

  if (recruitmentUnit.includes("(전공개방)")) {
    if (normalizedTrack === "자연" && placementKeys.has(`${prefix}자전자연`)) {
      return `${prefix}자전자연`;
    }
    if (normalizedTrack === "인문" && placementKeys.has(`${prefix}자전인문`)) {
      return `${prefix}자전인문`;
    }
    if (placementKeys.has(`${prefix}자전공통`)) {
      return `${prefix}자전공통`;
    }
  }

  if (containsAny(recruitmentUnit, ["진리자유학부", "자유전공", "학부대학"])) {
    if (recruitmentUnit.includes("(자연)") && placementKeys.has(`${prefix}자전자연`)) {
      return `${prefix}자전자연`;
    }
    if (recruitmentUnit.includes("(인문)") && placementKeys.has(`${prefix}자전인문`)) {
      return `${prefix}자전인문`;
    }
    if (placementKeys.has(`${prefix}자전공통`)) {
      return `${prefix}자전공통`;
    }
  }

  if (containsAny(recruitmentUnit, ["교육", "사범"]) && placementKeys.has(`${prefix}사범`)) {
    return `${prefix}사범`;
  }

  return null;
}

function normalizeTrackForDetailTrack(track: TrackType, recruitmentUnit: string | null): BaseTrack {
  const combined = `${track ?? ""} ${recruitmentUnit ?? ""}`;
  if (containsAny(combined, ["자연", "메디컬", "공학", "이공", "반도체", "컴퓨터", "인공지능"])) {
    return "자연";
  }
  return "인문";
}

function inferBucketByKeywords(
  normalizedTrack: BaseTrack,
  recruitmentUnit: string | null,
  firstKeywords: string[],
  thirdKeywords: string[],
  defaultBucket: "1" | "2" | "3" = "2",
): "1" | "2" | "3" {
  const value = recruitmentUnit ?? "";

  if (normalizedTrack === "인문") {
    if (containsAny(value, thirdKeywords)) {
      return "3";
    }
    if (containsAny(value, firstKeywords)) {
      return "1";
    }
    return defaultBucket;
  }

  if (containsAny(value, firstKeywords)) {
    return "1";
  }
  if (containsAny(value, thirdKeywords)) {
    return "3";
  }
  return defaultBucket;
}

function inferConfiguredDetailTrack(
  admission: AdmissionRecord,
  placementKeys: Set<string>,
  config: DetailTrackConfig,
): string | null {
  const normalizedTrack = normalizeTrackForDetailTrack(admission.track, admission.recruitmentUnit);
  const recruitmentUnit = admission.recruitmentUnit ?? "";
  const prefixRule = resolveAdmissionPrefixRule(admission, config);

  if (!prefixRule) {
    return null;
  }

  const prefix = prefixRule.prefix;
  const specialTrack = config.specialCase?.(admission, prefix, placementKeys);
  if (specialTrack) {
    return specialTrack;
  }

  const bucket = inferBucketByKeywords(
    normalizedTrack,
    recruitmentUnit,
    normalizedTrack === "인문"
      ? (config.firstKeywordsHumanities ?? [])
      : (config.firstKeywordsNatural ?? []),
    normalizedTrack === "인문"
      ? (config.thirdKeywordsHumanities ?? [])
      : (config.thirdKeywordsNatural ?? []),
    normalizedTrack === "인문"
      ? (config.defaultHumanitiesBucket ?? "2")
      : (config.defaultNaturalBucket ?? "2"),
  );

  const candidate = `${prefix}${normalizedTrack}${bucket}`;
  if (placementKeys.has(candidate)) {
    return candidate;
  }

  const fallbackCandidates = [
    `${prefix}${normalizedTrack}2`,
    `${prefix}${normalizedTrack}1`,
    `${prefix}${normalizedTrack}3`,
    ...DETAIL_TRACK_SPECIAL_SUFFIXES.map((suffix) => `${prefix}${suffix}`),
  ];

  return fallbackCandidates.find((item) => placementKeys.has(item)) ?? null;
}

function inferDetailTrack(
  admission: AdmissionRecord,
  comprehensiveRows: PlacementTableRow[],
  schoolRecordRows: PlacementTableRow[],
): string {
  const sourceRows =
    admission.admissionType === ADMISSION_TYPES.comprehensive
      ? comprehensiveRows
      : schoolRecordRows;
  const fallbackRows =
    admission.admissionType === ADMISSION_TYPES.comprehensive
      ? schoolRecordRows
      : comprehensiveRows;
  const placementKeys = new Set([...sourceRows, ...fallbackRows].map((row) => row.key));
  const currentDetailTrack = admission.detailTrack?.trim() ?? "";
  const config = DETAIL_TRACK_CONFIGS[admission.university ?? ""];
  const currentIsValid = currentDetailTrack && placementKeys.has(currentDetailTrack);

  if (!config) {
    return currentIsValid ? currentDetailTrack : currentDetailTrack;
  }

  const inferred = inferConfiguredDetailTrack(admission, placementKeys, config);
  if (inferred) {
    if (!currentIsValid) {
      return inferred;
    }

    const expectedPrefixes = getExpectedDetailTrackPrefixes(admission).flatMap((prefix) => [
      prefix,
      getRawPrefixFromDisplayAlias(prefix),
    ]);
    if (!startsWithAny(currentDetailTrack, expectedPrefixes)) {
      return inferred;
    }
  }

  return currentDetailTrack;
}

function toNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return Number(value);
}

function normalizeReference(formula: string | null): string | null {
  if (!formula) {
    return null;
  }

  return formula.replace(/^=/, "").replaceAll("'", "");
}

export function normalizeTrack(track: TrackType): BaseTrack {
  return String(track).includes("자연") ? "자연" : "인문";
}

export function createSchoolSelectionLabel(school: SchoolRecord): string {
  return `${school.schoolName} (${school.province}/${school.district})`;
}

export function findSchoolBySelection(
  dataset: CalculatorDataset,
  schoolSelection: string,
  province?: string,
  district?: string,
): SchoolRecord | undefined {
  if (province && district) {
    const exactMatch = dataset.schools.find((school) => {
      return (
        school.schoolName === schoolSelection &&
        school.province === province &&
        school.district === district
      );
    });

    if (exactMatch) {
      return exactMatch;
    }
  }

  return dataset.schools.find((school) => {
    return (
      createSchoolSelectionLabel(school) === schoolSelection ||
      school.schoolName === schoolSelection
    );
  });
}

export function resolveTierForAdmission(
  admission: AdmissionRecord,
  school: SchoolRecord | undefined,
): PlacementTier | "" {
  if (!school) {
    return "";
  }

  return normalizeTrack(admission.track) === "자연"
    ? school.naturalTier
    : school.humanitiesTier;
}

export function resolveStudentScore(
  input: CalculatorInput,
  scoreRef: string | null,
): number | null {
  const normalizedRef = normalizeReference(scoreRef);
  const key = normalizedRef ? INPUT_METRIC_BY_REF[normalizedRef] : undefined;

  if (!key) {
    return input.grades.coreAll;
  }

  if (key in input.grades) {
    return input.grades[key as keyof typeof input.grades];
  }

  return input.mockExam[key as keyof typeof input.mockExam];
}

export function buildPlacementTableFromAdjustments(
  sections: AdjustmentSection[],
): PlacementTableRow[] {
  const rows: PlacementTableRow[] = [];

  for (const section of sections) {
    const tierBonusMap = new Map(section.tierBonuses.map((rule) => [rule.tier, rule] as const));
    const offsetMap = new Map(section.offsets.map((rule) => [rule.tier, rule] as const));
    const gapMap = new Map(section.academicGaps.map((rule) => [rule.tier, rule] as const));
    const baseMap = new Map(
      section.baseThresholds.map((rule) => [rule.academicType, rule] as const),
    );

    for (const baseRule of section.baseThresholds) {
      if (!baseRule.academicType) {
        continue;
      }

      const track = normalizeTrack(baseRule.track ?? "인문");
      const thresholdsByTier = {} as Record<PlacementTier, ThresholdSet>;
      const match = baseRule.academicType.match(/(인문|자연)([123])$/);
      const gapBaseKey = match
        ? baseRule.academicType.replace(/[13]$/, "2")
        : baseRule.academicType;

      for (const tier of TIER_ORDER) {
        const bonusRule = tierBonusMap.get(tier);
        const offsetRule = offsetMap.get(tier);
        const gapRule = gapMap.get(tier);
        const directBase = toNumber(baseRule.baseFitScore);
        const gapBase = toNumber(baseMap.get(gapBaseKey)?.baseFitScore ?? null);
        const tierBonus =
          track === "자연"
            ? toNumber(bonusRule?.natural)
            : toNumber(bonusRule?.humanities);
        const gapValue =
          track === "자연"
            ? toNumber(gapRule?.naturalGap)
            : toNumber(gapRule?.humanitiesGap);

        let fit: number | null = null;

        if (match && match[2] !== "2") {
          if (tier === "C" && directBase !== null) {
            fit = directBase;
          } else if (
            gapBase !== null &&
            tierBonus !== null &&
            gapValue !== null
          ) {
            fit =
              match[2] === "1"
                ? gapBase + tierBonus - gapValue
                : gapBase + tierBonus + gapValue;
          } else if (directBase !== null && tierBonus !== null) {
            fit = directBase + tierBonus;
          } else if (directBase !== null) {
            fit = directBase;
          }
        } else if (directBase !== null && tierBonus !== null) {
          fit = directBase + tierBonus;
        } else if (directBase !== null) {
          fit = directBase;
        }

        const reachOffset = toNumber(offsetRule?.reachOffset);
        const safeOffset = toNumber(offsetRule?.safeOffset);

        thresholdsByTier[tier] = {
          reach: fit !== null && reachOffset !== null ? fit + reachOffset : null,
          fit,
          safe: fit !== null && safeOffset !== null ? fit + safeOffset : null,
        };
      }

      rows.push({
        key: baseRule.academicType,
        section: section.name,
        track,
        thresholdsByTier,
      });
    }
  }

  return rows;
}

export function getComprehensivePlacementRows(
  dataset: CalculatorDataset,
): PlacementTableRow[] {
  const cached = comprehensivePlacementCache.get(dataset);
  if (cached) {
    return cached;
  }

  const rebuiltRows = buildPlacementTableFromAdjustments(dataset.comprehensiveAdjustments);
  const rows = Array.from(
    new Map(
      [...rebuiltRows, ...dataset.comprehensivePlacementTable].map((row) => [row.key, row] as const),
    ).values(),
  );
  comprehensivePlacementCache.set(dataset, rows);
  return rows;
}

export function getSchoolRecordPlacementRows(
  dataset: CalculatorDataset,
): PlacementTableRow[] {
  const cached = schoolRecordPlacementCache.get(dataset);
  if (cached) {
    return cached;
  }

  const rebuiltRows = buildPlacementTableFromAdjustments(dataset.schoolRecordAdjustments);
  const rows = Array.from(
    new Map(
      [...rebuiltRows, ...dataset.schoolRecordPlacementTable].map((row) => [row.key, row] as const),
    ).values(),
  );
  schoolRecordPlacementCache.set(dataset, rows);
  return rows;
}

export function resolvePlacementThresholds(
  admission: AdmissionRecord,
  tier: PlacementTier | "",
  comprehensiveRows: PlacementTableRow[],
  schoolRecordRows: PlacementTableRow[],
): ThresholdSet {
  if (!tier) {
    return { reach: null, fit: null, safe: null };
  }

  const sourceRows =
    admission.admissionType === ADMISSION_TYPES.comprehensive
      ? comprehensiveRows
      : schoolRecordRows;
  const fallbackRows =
    admission.admissionType === ADMISSION_TYPES.comprehensive
      ? schoolRecordRows
      : comprehensiveRows;
  const resolvedDetailTrack = inferDetailTrack(admission, comprehensiveRows, schoolRecordRows);
  const matchedRow =
    sourceRows.find((row) => row.key === resolvedDetailTrack) ??
    fallbackRows.find((row) => row.key === resolvedDetailTrack);

  if (!matchedRow) {
    return { reach: null, fit: null, safe: null };
  }

  return matchedRow.thresholdsByTier[tier];
}

export function determineJudgment(
  score: number | null,
  thresholds: ThresholdSet,
): Judgment {
  if (
    score === null ||
    thresholds.reach === null ||
    thresholds.fit === null ||
    thresholds.safe === null
  ) {
    return "";
  }

  if (score <= thresholds.safe + NUMBER_EPSILON) {
    return JUDGMENTS.safe;
  }
  if (score <= thresholds.fit + NUMBER_EPSILON) {
    return JUDGMENTS.fit;
  }
  if (score <= thresholds.reach + NUMBER_EPSILON) {
    return JUDGMENTS.challenge;
  }
  return JUDGMENTS.upward;
}

export function calculateResults(
  dataset: CalculatorDataset,
  input: CalculatorInput,
): CalculatedAdmissionRow[] {
  const school = findSchoolBySelection(dataset, input.schoolName);
  const comprehensiveRows = getComprehensivePlacementRows(dataset);
  const schoolRecordRows = getSchoolRecordPlacementRows(dataset);

  return dataset.admissions.map((admission) => {
    const resolvedDetailTrack = inferDetailTrack(admission, comprehensiveRows, schoolRecordRows);
    const computedTier = resolveTierForAdmission(admission, school);
    const computedScore = resolveStudentScore(input, admission.scoreRef);
    const computedThresholds = resolvePlacementThresholds(
      {
        ...admission,
        detailTrack: resolvedDetailTrack,
      },
      computedTier,
      comprehensiveRows,
      schoolRecordRows,
    );
    const computedJudgment = determineJudgment(computedScore, computedThresholds);

    return {
      ...admission,
      detailTrack: resolvedDetailTrack,
      computedTier,
      computedScore,
      computedThresholds,
      computedJudgment,
    };
  });
}

export function normalizeAdmissionsDetailTracks(
  admissions: AdmissionRecord[],
  comprehensiveRows: PlacementTableRow[],
  schoolRecordRows: PlacementTableRow[],
): AdmissionRecord[] {
  return admissions.map((admission) => ({
    ...admission,
    detailTrack: inferDetailTrack(admission, comprehensiveRows, schoolRecordRows),
  }));
}

function sameNumber(left: number | null, right: number | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  return Math.abs(left - right) <= NUMBER_EPSILON;
}

export function compareThresholds(left: ThresholdSet, right: ThresholdSet): boolean {
  return (
    sameNumber(left.reach, right.reach) &&
    sameNumber(left.fit, right.fit) &&
    sameNumber(left.safe, right.safe)
  );
}

export function buildValidationPayload(
  dataset: CalculatorDataset,
): CalculatedAdmissionRow[] {
  return calculateResults(dataset, dataset.defaultInput);
}

export function buildSchoolOptions(
  dataset: CalculatorDataset,
): SchoolRecord[] {
  return dataset.schools
    .slice()
    .sort((left, right) => {
      const nameCompare = left.schoolName.localeCompare(right.schoolName, "ko");
      if (nameCompare !== 0) {
        return nameCompare;
      }

      const provinceCompare = left.province.localeCompare(right.province, "ko");
      if (provinceCompare !== 0) {
        return provinceCompare;
      }

      return left.district.localeCompare(right.district, "ko");
    });
}

export function buildDistrictOptions(
  dataset: CalculatorDataset,
  province: string,
): string[] {
  return dataset.regionTree.districtsByProvince[province] ?? [];
}

export function describeTierLabel(tier: PlacementTier | ""): string {
  return tier ? `${tier} 티어` : "-";
}
