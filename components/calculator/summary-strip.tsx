import type { CalculatedAdmissionRow } from "@/src/types/calculator";

interface SummaryStripProps {
  rows: CalculatedAdmissionRow[];
}

function countBy(
  rows: CalculatedAdmissionRow[],
  judgment: CalculatedAdmissionRow["computedJudgment"],
) {
  return rows.filter((row) => row.computedJudgment === judgment).length;
}

export function SummaryStrip({ rows }: SummaryStripProps) {
  const cards = [
    { label: "전체 결과", value: rows.length, tone: "bg-slate-900 text-white" },
    { label: "안정", value: countBy(rows, "안정"), tone: "bg-emerald-50 text-emerald-700" },
    { label: "적정", value: countBy(rows, "적정"), tone: "bg-sky-50 text-sky-700" },
    { label: "소신", value: countBy(rows, "소신"), tone: "bg-amber-50 text-amber-700" },
    { label: "상향", value: countBy(rows, "상향"), tone: "bg-rose-50 text-rose-700" },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {cards.map((card) => (
        <article
          key={card.label}
          className={`rounded-3xl border border-line px-4 py-4 ${card.tone}`}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
            {card.label}
          </div>
          <div className="mt-2 text-2xl font-black">{card.value.toLocaleString()}</div>
        </article>
      ))}
    </div>
  );
}

