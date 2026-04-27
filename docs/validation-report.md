# Validation Report

## Scope

- Runtime helper: `src/lib/calculation.ts`
- Input set: default workbook values from `성적입력`
- Placement-table comparison: 종합/교과 모두 0 mismatch
- Result-row comparison: 5630 rows checked, 26 mismatches

## Sample Checks

| Sample | No. | Excel | App | Match |
| --- | ---: | --- | --- | --- |
| 고려대학교 경영대학 | 1025 | 티어 A, 점수 3, 컷 2.9499999999999997 / 2.55 / 2.25, 판정 상향 | 티어 A, 점수 3, 컷 2.9499999999999997 / 2.55 / 2.25, 판정 상향 | PASS |
| 고려대학교 기계공학부 | 1045 | 티어 A, 점수 3, 컷 3.8 / 3.4 / 3.1, 판정 안정 | 티어 A, 점수 3, 컷 3.8 / 3.4 / 3.1, 판정 안정 | PASS |
| 건국대학교 경영학과 | 282 | 티어 A, 점수 3, 컷 1.88 / 1.8299999999999998 / 1.7799999999999998, 판정 상향 | 티어 A, 점수 3, 컷 1.88 / 1.8299999999999998 / 1.7799999999999998, 판정 상향 | PASS |
| 건국대학교 건축학부 | 278 | 티어 A, 점수 3, 컷 1.93 / 1.88 / 1.8299999999999998, 판정 상향 | 티어 A, 점수 3, 컷 1.93 / 1.88 / 1.8299999999999998, 판정 상향 | PASS |
| 고려대학교 교육학과 | 1032 | 티어 A, 점수 3, 컷 3.15 / 2.75 / 2.45, 판정 소신 | 티어 A, 점수 3, 컷 3.15 / 2.75 / 2.45, 판정 소신 | PASS |

## Mismatch Classification

- stale_or_inconsistent_data: 26
- reconstruction_logic: 0
- comparison_logic: 0

## First Isolated Mismatch

- No.: 1707
- 대학: 동국대학교
- 상세계열: 동국종합자전공통
- Category: stale_or_inconsistent_data
- Root cause: Excel cached judgment remains even though both Excel and app thresholds are blank.

| Field | Excel | App |
| --- | --- | --- |
| Tier | A | A |
| Score | 3 | 3 |
| Reach | - | - |
| Fit | - | - |
| Safe | - | - |
| Judgment | 안정 | - |

## Mismatched Rows

| No. | 대학 | 상세계열 | Category | Excel | App | Root cause |
| ---: | --- | --- | --- | --- | --- | --- |
| 1707 | 동국대학교 | 동국종합자전공통 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2470 | 서강대학교 | 서강일반1자전공통 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2493 | 서강대학교 | 서강일반1자전공통 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2495 | 서강대학교 | 서강일반1자전공통 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2469 | 서강대학교 | 서강교과자전공통 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2492 | 서강대학교 | 서강교과자전공통 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2494 | 서강대학교 | 서강교과자전공통 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 1176 | 고려대학교 | 고려학업자전공통 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 0 / 0 / 0, 판정 상향 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached 0/0/0 thresholds persist, but the current runtime resolves the row as blank. |
| 2585 | 서울대학교 | 서울일반사범 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2596 | 서울대학교 | 서울일반사범 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2600 | 서울대학교 | 서울일반사범 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2622 | 서울대학교 | 서울일반사범 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2633 | 서울대학교 | 서울일반사범 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2656 | 서울대학교 | 서울일반사범 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2660 | 서울대학교 | 서울일반사범 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2665 | 서울대학교 | 서울일반사범 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2691 | 서울대학교 | 서울일반사범 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2695 | 서울대학교 | 서울일반사범 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2714 | 서울대학교 | 서울일반사범 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 2676 | 서울대학교 | 서울지균자전공통 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 3638 | 연세대학교 | 연세교과자연2 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 3615 | 연세대학교 | 연세교과자전공통 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 0 / 0 / 0, 판정 상향 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached 0/0/0 thresholds persist, but the current runtime resolves the row as blank. |
| 3618 | 연세대학교 | 연세교과자전자연 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 0 / 0 / 0, 판정 상향 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached 0/0/0 thresholds persist, but the current runtime resolves the row as blank. |
| 3639 | 연세대학교 | 연세활동자연2 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 3616 | 연세대학교 | 연세활동자전공통 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |
| 3617 | 연세대학교 | 연세활동자전자연 | stale_or_inconsistent_data | 티어 A, 점수 3, 컷 - / - / -, 판정 안정 | 티어 A, 점수 3, 컷 - / - / -, 판정 - | Excel cached judgment remains even though both Excel and app thresholds are blank. |

## Conclusion

- 배치표 재구성 로직은 종합/교과 모두 검증 범위에서 일치합니다.
- 남은 26건은 앱 계산 문제라기보다 Excel cached 결과가 남아 있는 stale/inconsistent row로 분류했습니다.
- 추가 검증이 필요하면 동일 런타임 헬퍼를 유지한 채 다른 입력 세트를 더 추출해 비교하면 됩니다.