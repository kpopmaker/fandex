type SourcePipelineStage = {
  version: string;
  label: string;
  purpose: string;
};

const sourcePipelineStages: SourcePipelineStage[] = [
  {
    version: 'v7',
    label: 'Source Item',
    purpose: 'source item과 candidate 구조 확인',
  },
  {
    version: 'v8',
    label: 'Provider Import',
    purpose: 'provider adapter와 import pipeline preview',
  },
  {
    version: 'v9',
    label: 'Snapshot Diff',
    purpose: 'snapshot history와 diff 비교',
  },
  {
    version: 'v10',
    label: 'Quality Score',
    purpose: 'source quality scoring 후보 확인',
  },
  {
    version: 'v11',
    label: 'Eligibility',
    purpose: 'source/candidate eligibility 확인',
  },
  {
    version: 'v12',
    label: 'Application',
    purpose: 'source signal application plan preview',
  },
  {
    version: 'v13',
    label: 'Impact',
    purpose: 'score 반영 전 impact 후보 확인',
  },
  {
    version: 'v14',
    label: 'Review Queue',
    purpose: '검토 대상 source signal queue 정리',
  },
  {
    version: 'v15',
    label: 'Review Action',
    purpose: 'approve/hold/limit/reject/skip action 후보 확인',
  },
];

const safetyNotes = [
  '실제 FANDEX 점수 계산에 반영되지 않음',
  '외부 API/DB/Supabase 연결 없음',
  'fixture/helper 기반 read-only preview',
  '승인/거절/action은 실제 저장되지 않음',
];

const nextSteps = [
  'ingestion draft 설계',
  'provider adapter 강화',
  'storage/sync policy 설계',
  '제한적 실제 source 연결',
  '별도 PR에서 score 반영 검토',
];

export default function SourcePipelineOverviewSection() {
  return (
    <section className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
              source pipeline overview
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Source Pipeline Overview
            </h2>
            <div className="mt-2 max-w-4xl space-y-1 text-sm font-bold leading-7 text-slate-600">
              <p>
                외부 source가 실제 FANDEX 점수에 반영되기 전까지 거치는
                read-only preview pipeline입니다.
              </p>
              <p>
                현재 v15까지는 실제 반영 없이 품질, 자격, 연결, 영향, 검토,
                action 후보를 확인하는 단계입니다.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm font-black leading-7 text-cyan-800">
            {safetyNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sourcePipelineStages.map((stage) => (
            <StageCard key={stage.version} stage={stage} />
          ))}
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700">
              pipeline flow
            </p>
            <p className="mt-2 text-sm font-black leading-7 text-slate-700">
              source item / candidate preview -&gt; provider import -&gt;
              snapshot diff -&gt; quality score -&gt; eligibility -&gt;
              application -&gt; impact -&gt; review queue -&gt; review action -&gt;
              future ingestion / storage / score application
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700">
              next candidates
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {nextSteps.map((step) => (
                <span
                  key={step}
                  className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600"
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StageCard({ stage }: { stage: SourcePipelineStage }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-black text-cyan-700">
            {stage.version}
          </p>
          <h3 className="mt-2 text-lg font-black">{stage.label}</h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          완료
        </span>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
        {stage.purpose}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Mini label="상태" value="완료" />
        <Mini label="실제 반영" value="반영 안 함" />
      </div>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}
