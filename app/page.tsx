import Link from "next/link";

const highlights = [
  "성적입력 시트 구조를 기준으로 시도 > 행정구 > 학교명 종속 드롭다운을 웹 상태로 재구성했습니다.",
  "종합보정값·교과보정값 시트에서 배치표를 재생성하도록 계산 로직을 TypeScript 함수로 이식했습니다.",
  "계산기 시트 결과를 기준으로 필터·정렬 가능한 대용량 결과 테이블을 제공합니다.",
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-12">
      <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/80 shadow-panel backdrop-blur">
        <div className="grid gap-10 border-b border-line/70 px-8 py-10 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-accent-500/20 bg-accent-50 px-4 py-1 text-sm font-semibold text-accent-600">
              Excel to Web Reconstruction
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tight text-slate-900">
                수시 배치 계산기 웹 서비스
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-700">
                원본 엑셀의 입력 구조, 시트 간 참조, 배치표/보정값 기반 판단 로직을
                Next.js + TypeScript로 재구성한 로컬 실행형 프로젝트입니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/calculator"
                className="rounded-full bg-accent-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-600"
              >
                계산기 열기
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-amberline/40 bg-gradient-to-br from-[#fffdf8] via-[#fbf5e8] to-[#eef6f8] p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
              구현 범위
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              {highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3"
                >
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-6 px-8 py-8 lg:grid-cols-3">
          <article className="rounded-3xl border border-line bg-[#fffdfa] p-6">
            <h2 className="text-lg font-bold text-slate-900">입력</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              시도, 행정구, 학교명, 생기부 관련 값, 내신, 모의고사 등급을 웹 폼으로
              입력합니다.
            </p>
          </article>
          <article className="rounded-3xl border border-line bg-[#fffdfa] p-6">
            <h2 className="text-lg font-bold text-slate-900">계산</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              엑셀 수식을 직접 실행하지 않고, 배치표 재구성 규칙과 판단 로직을 코드로
              계산합니다.
            </p>
          </article>
          <article className="rounded-3xl border border-line bg-[#fffdfa] p-6">
            <h2 className="text-lg font-bold text-slate-900">검증</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              기본 입력값 기준으로 Excel cached 결과와 앱 계산 결과를 비교한 검증
              문서를 함께 제공합니다.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
