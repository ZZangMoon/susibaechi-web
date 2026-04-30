# 수시 배치 계산기 웹앱

입시위키 `수시 배치 계산기` 엑셀을 분석해 Next.js + TypeScript + Tailwind CSS 기반 웹 프로젝트로 재구성한 로컬 실행형 앱입니다.

## 설치 방법

```bash
npm install
```

## 실행 방법

```bash
npm run excel:json
npm run validate:excel
npm run dev
```

또는 폴더 안의 `웹기반 수시 계산기 실행.bat` 파일을 더블클릭하면:

- 필요한 경우 `npm install` 자동 실행
- 필요한 경우 `npm run excel:json` 자동 실행
- 개발 서버 실행
- 브라우저에서 `http://localhost:3000` 자동 열기

또는 `수시 계산기 브라우저 실행.vbs` 파일을 더블클릭하면:

- 콘솔 창을 띄우지 않고 백그라운드에서 정적 배포본을 실행
- 브라우저만 바로 열기
- 배포용 `.next-prod` 폴더가 있으면 Node.js 없이 실행 가능
- `.next-prod` 폴더가 없을 때만 현재 PC에 Node.js가 있으면 자동으로 build를 시도

- `npm run excel:json`: 원본 엑셀 `source-workbook.xlsx`를 파싱해 `src/data/calculator-dataset.json`을 생성합니다.
- `npm run validate:excel`: 앱 런타임 헬퍼와 동일한 계산 함수를 사용해 Excel cached 결과와 앱 결과를 비교하고 `docs/validation-report.md`를 갱신합니다.
- `npm run dev`: 로컬 개발 서버를 실행합니다.
- `npm run package:portable`: Node.js가 없는 PC에서도 실행 가능한 포터블 배포본 ZIP을 `portable-release` 폴더에 생성합니다.
- `배포업로드.bat`: 원본 폴더를 기준으로 임시 깨끗한 배포 저장소를 만든 뒤 GitHub에 업로드하고, Vercel 자동 배포를 트리거합니다.
- `배포업로드-새버전.bat`: 인코딩 문제를 피한 최신 배포 버튼입니다. 앞으로는 이 파일을 사용하는 것을 권장합니다.

## 배포 권장 방식

다른 사람에게 전달할 때는 전체 프로젝트 폴더를 그대로 압축해서 보내기보다 `npm run package:portable` 로 만든 포터블 배포본을 보내는 것을 권장합니다.

- 포함 파일: 정적 배포본(`.next-prod`), 실행 스크립트, 실행 안내
- 장점: Node.js 미설치 PC에서도 실행 가능
- 장점: `node_modules`, 소스코드, 개발 캐시를 제외해 용량과 오류 가능성을 줄임

## 페이지 구조

- `/`: 프로젝트 개요 페이지
- `/calculator`: 좌측 입력 패널 + 우측 기준표 편집/결과 테이블 메인 계산기

## 시트별 데이터 이관 구조

- `성적입력` -> `defaultInput`, 입력 폼 구조
- `목록` -> `regionTree`
- `고등학교DB` -> `schools`
- `계산기` -> `admissions`
- `종합보정값` -> `comprehensiveAdjustments`
- `교과보정값` -> `schoolRecordAdjustments`
- `종합배치표` -> `comprehensivePlacementTable`
- `교과배치표` -> `schoolRecordPlacementTable`

## 컴포넌트 구조

- `app/page.tsx`: 메인 안내 페이지
- `app/calculator/page.tsx`: 계산기 라우트
- `components/calculator/calculator-page.tsx`: 상태 조합, 계산, 필터/정렬
- `components/calculator/input-panel.tsx`: 성적입력 시트 웹 폼
- `components/calculator/results-toolbar.tsx`: 필터/정렬 바
- `components/calculator/rule-editor-panel.tsx`: 배치표/보정값 편집 패널
- `components/calculator/results-table.tsx`: 가상 스크롤 결과 표
- `components/calculator/summary-strip.tsx`: 판정 요약 카드
- `src/lib/calculation.ts`: 핵심 계산 로직
- `scripts/excel-to-json.ts`: 엑셀 -> JSON 변환 스크립트
- `scripts/validate-samples.ts`: Excel vs 앱 비교 검증 스크립트

## 검증 범위

- 배치표 재구성 검증:
  - 종합배치표 148행 기준 0 mismatch
  - 교과배치표 526행 기준 0 mismatch
- 결과행 검증:
  - 계산기 시트 5630행 비교
  - 이 중 26행 mismatch
  - 26행 모두 stale 또는 inconsistent Excel cached row로 분류
- 대표 샘플 검증 결과는 `docs/validation-report.md`에 정리했습니다.

## 아직 완전 이식되지 않은 항목

- `성적입력`의 생기부 관련 텍스트 입력은 UI로 보존했지만, 현재 확인된 `계산기` 결과행 수식에서는 직접 참조가 드러나지 않아 상태 저장까지만 구현했습니다.
- 내신 입력은 사용자 요청에 따라 `전교과평균` 1개 입력으로 단순화했습니다. 따라서 원본 엑셀의 세부 교과 평균 분기와 1:1 동일한 입력 모델은 아닙니다.
- 계산기 안에서 `종합배치표/종합보정값/교과배치표/교과보정값`을 직접 수정할 수 있지만, 현재는 로컬 세션 상태로만 반영되며 별도 저장/불러오기는 아직 없습니다.
- 기본 입력값 외 추가 시나리오에 대한 대량 샘플 검증은 아직 문서화 범위 밖입니다.
- 병합셀, 서식, 색상, 엑셀 특유의 시각 표현은 우선순위에서 제외했습니다.

## 문서

- `docs/excel-analysis.md`: 시트 역할 및 수식 패턴 분석
- `docs/calculation-logic.md`: 계산 로직 설명
- `docs/validation-report.md`: Excel vs 앱 검증 보고서

## 주의

- "완전히 동일"하다고 단정하지 않았습니다.
- 현재 확인된 범위는 기본 입력값 기준 배치표 재구성과 결과행 비교입니다.
- 남은 mismatch는 앱 계산식 문제로 보지 않고, 원본 엑셀 cached 결과 잔존 문제로 분리해 기록했습니다.
