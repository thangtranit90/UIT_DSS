"use client";
import React, { useEffect, useMemo, useState } from "react";
import { CRITERIA, costKeys, type Category } from "@/lib/criteria";
import { getProducts, priceStats, money, type Product } from "@/lib/data";
import { ahp, matrixFromPairs } from "@/lib/ahp";
import { topsis, type Ranked } from "@/lib/topsis";
import { Bar, Ring, Icon, Badge, Info, cx } from "@/components/ui";

type Step = "home" | "workbench" | "budget" | "weights" | "results";

const saaty = (k: number) => (k > 0 ? 2 * k + 1 : k < 0 ? 1 / (2 * -k + 1) : 1);
const saatyLabel = (a: number) =>
  a === 1 ? "Ngang nhau" : `Quan trọng hơn ×${a % 1 === 0 ? a : a.toFixed(0)}`;

export default function App() {
  const [step, setStep] = useState<Step>("home");
  const [category, setCategory] = useState<Category>("laptop");
  const stats = useMemo(() => priceStats(category), [category]);
  const [budget, setBudget] = useState<number>(0);
  const [pairVal, setPairVal] = useState<Record<string, number>>({});
  const [pairIdx, setPairIdx] = useState(0);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<Product | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const crit = CRITERIA[category];
  const n = crit.length;
  const pairs = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]);
    return out;
  }, [n]);

  const ahpRes = useMemo(() => {
    const map: Record<string, number> = {};
    // slider k>0 = criterion j (right) more important -> a_ij (left over right) < 1
    pairs.forEach(([i, j]) => (map[`${i}-${j}`] = saaty(-(pairVal[`${i}-${j}`] ?? 0))));
    return ahp(matrixFromPairs(n, map));
  }, [pairs, pairVal, n]);

  const weights = useMemo(() => {
    const w: Record<string, number> = {};
    crit.forEach((c, i) => (w[c.key] = ahpRes.weights[i]));
    return w;
  }, [crit, ahpRes]);

  const ranked = useMemo(() => {
    const items = getProducts(category).filter((p) => p.price <= budget);
    return topsis<Product>(items, (p) => p.criteria, weights, costKeys(category));
  }, [category, budget, weights]);

  const switchCat = (c: Category) => {
    setCategory(c);
    setBudget(priceStats(c).p75);
    setPairVal({});
    setPairIdx(0);
    setCompareIds([]);
  };
  const start = (c: Category) => {
    switchCat(c);
    setStep("workbench");
  };

  const toggleCompare = (id: string) =>
    setCompareIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s));

  return (
    <div className="min-h-screen font-body text-ink">
      <Nav category={category} step={step} onHome={() => setStep("home")} />
      <main className="mx-auto max-w-6xl px-5 py-6 sm:py-10">
        {step === "home" && <Home stats={priceStats} onStart={start} />}
        {step === "workbench" && (
          <Workbench category={category} onSwitchCategory={switchCat}
            budget={budget} setBudget={setBudget} stats={stats}
            crit={crit} pairs={pairs} pairIdx={pairIdx} setPairIdx={setPairIdx}
            pairVal={pairVal} setPairVal={setPairVal} ahpRes={ahpRes} weights={weights}
            ranked={ranked} compareIds={compareIds} toggleCompare={toggleCompare}
            onDetail={setDetail} onCompare={() => setShowCompare(true)} />
        )}
        {step === "budget" && (
          <Budget category={category} stats={stats} budget={budget} setBudget={setBudget}
            onBack={() => setStep("home")} onNext={() => setStep("weights")} />
        )}
        {step === "weights" && (
          <Weights crit={crit} pairs={pairs} pairIdx={pairIdx} setPairIdx={setPairIdx}
            pairVal={pairVal} setPairVal={setPairVal} ahpRes={ahpRes} weights={weights}
            onBack={() => setStep("budget")} onNext={() => setStep("results")} />
        )}
        {step === "results" && (
          <Results category={category} ranked={ranked} weights={weights} crit={crit}
            compareIds={compareIds} toggleCompare={toggleCompare}
            budget={budget} setBudget={setBudget} stats={stats}
            onDetail={setDetail} onCompare={() => setShowCompare(true)}
            onBack={() => setStep("weights")} />
        )}
      </main>
      {detail && (
        <Detail p={detail} ranked={ranked} weights={weights} category={category}
          ahpRes={ahpRes} onClose={() => setDetail(null)} />
      )}
      {showCompare && (
        <Compare ranked={ranked.filter((r) => compareIds.includes(r.item.id))} category={category}
          onClose={() => setShowCompare(false)} />
      )}
    </div>
  );
}

function Workbench({ category, onSwitchCategory, budget, setBudget, stats, crit, pairs, pairIdx, setPairIdx,
  pairVal, setPairVal, ahpRes, weights, ranked, compareIds, toggleCompare, onDetail, onCompare }: any) {
  const PAGE = 9;
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [ranked.length, category]);
  const [i, j] = pairs[pairIdx];
  const key = `${i}-${j}`;
  const k = pairVal[key] ?? 0;
  const a = crit[i], b = crit[j];
  const set = (v: number) => setPairVal((s: any) => ({ ...s, [key]: v }));
  const order = crit.map((c: any) => ({ ...c, w: weights[c.key] })).sort((x: any, y: any) => y.w - x.w);
  const topCrit = order.slice(0, 3);
  const bnd = boundsOf(ranked, crit.map((c: any) => c.key));
  const rest = ranked.slice(1);
  const pageCount = Math.max(1, Math.ceil(rest.length / PAGE));
  const cur = Math.min(page, pageCount - 1);
  const pageItems = rest.slice(cur * PAGE, cur * PAGE + PAGE);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
      {/* CONTROL PANEL */}
      <aside className="grid gap-4 lg:sticky lg:top-20">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
          {(["laptop", "phone"] as Category[]).map((c) => (
            <button key={c} onClick={() => onSwitchCategory(c)}
              className={cx("flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition",
                category === c ? "bg-bg shadow-sm text-ink border border-border" : "text-muted")}>
              <Icon name={c === "laptop" ? "laptop" : "smartphone"} size={16} />
              {c === "laptop" ? "Laptop" : "Điện thoại"}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-bg p-5 grid gap-3">
          <div className="flex items-end justify-between">
            <span className="text-sm font-semibold text-muted">NGÂN SÁCH TỐI ĐA</span>
            <span className="font-head text-2xl font-extrabold text-accent">{money(budget)}</span>
          </div>
          <input type="range" min={Math.floor(stats.min)} max={Math.ceil(stats.max)} value={budget}
            onChange={(e) => setBudget(+e.target.value)} className="w-full" />
          <div className="flex justify-between text-xs text-faint"><span>{money(stats.min)}</span><span>{money(stats.max)}</span></div>
        </div>

        <div className="rounded-2xl border border-border bg-bg p-5 grid gap-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 font-head font-bold text-sm">
              So sánh cặp (AHP)
              <Info label="Công thức">
                <b>AHP</b>: wᵢ = (∏ⱼ aᵢⱼ)^(1/n), Σw = 1<br />
                <b>CR = CI/RI</b>, CI = (λmax − n)/(n − 1); CR ≤ 0.1 ⇒ nhất quán.
              </Info>
            </span>
            <span className="text-xs text-faint">Cặp {pairIdx + 1}/{pairs.length}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className={cx("rounded-lg border-2 p-2.5 text-center text-sm font-bold", k < 0 ? "border-accent bg-accentSoft" : "border-border")}>{a.label}</div>
            <span className="text-[10px] font-bold text-faint">vs</span>
            <div className={cx("rounded-lg border-2 p-2.5 text-center text-sm font-bold", k > 0 ? "border-accent bg-accentSoft" : "border-border")}>{b.label}</div>
          </div>
          <input type="range" min={-4} max={4} step={1} value={k} onChange={(e) => set(+e.target.value)} className="w-full" />
          <div className="text-center text-xs font-semibold text-accentDark">
            {k === 0 ? "Ngang nhau" : `${(k < 0 ? a : b).label} ${saatyLabel(saaty(Math.abs(k)))}`}
          </div>
          <div className="flex gap-2">
            <button disabled={pairIdx === 0} onClick={() => setPairIdx((x: number) => x - 1)}
              className="flex-1 rounded-lg border-[1.5px] border-border py-2 text-sm font-bold disabled:opacity-40">‹ Trước</button>
            <button disabled={pairIdx >= pairs.length - 1} onClick={() => setPairIdx((x: number) => x + 1)}
              className="flex-1 rounded-lg bg-accent py-2 text-sm font-bold text-white disabled:opacity-40">Sau ›</button>
          </div>
          <div className="border-t border-border pt-3 grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted">TRỌNG SỐ (AHP)</span>
              <Badge tone={ahpRes.consistent ? "success" : "muted"}>
                <Icon name={ahpRes.consistent ? "check" : "info"} size={12} /> CR {ahpRes.cr.toFixed(2)}
              </Badge>
            </div>
            {order.map((c: any) => (
              <div key={c.key} className="flex items-center gap-2">
                <span className="w-24 text-xs text-muted">{c.label}</span>
                <Bar value={c.w * 100} />
                <span className="w-9 text-right font-head font-bold text-xs">{(c.w * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* LIVE RANKING */}
      <section className="grid gap-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-head text-2xl font-extrabold flex items-center gap-1.5">
              Xếp hạng
              <Info label="TOPSIS">
                <b>TOPSIS</b>: rₖ = xₖ/√Σx² · vₖ = wₖ·rₖ · A⁺/A⁻ lý tưởng tốt/xấu<br />
                <b>Điểm = C* = D⁻/(D⁺+D⁻) × 100</b>, trọng số wₖ từ AHP.
              </Info>
            </h2>
            <p className="text-muted text-sm">
              {ranked.length} sản phẩm ≤ {money(budget)} · điểm % là <b>TOPSIS closeness</b> — cập nhật ngay khi bạn chỉnh
            </p>
          </div>
          {compareIds.length >= 2 && (
            <button onClick={onCompare} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white">
              <Icon name="compare" size={16} /> So sánh ({compareIds.length})
            </button>
          )}
        </div>
        {ranked.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-bg p-10 text-center text-muted">
            Chưa có sản phẩm ≤ {money(budget)}. Kéo tăng ngân sách bên trái để thấy kết quả.
          </div>
        ) : (
          <>
            {cur === 0 && <HeroCard r={ranked[0]} topCrit={topCrit} category={category} bnd={bnd}
              selected={compareIds.includes(ranked[0].item.id)} onDetail={onDetail} onCompare={toggleCompare} />}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((r: Ranked<Product>) => (
                <RankCard key={r.item.id} r={r} topCrit={topCrit} bnd={bnd}
                  selected={compareIds.includes(r.item.id)} onDetail={onDetail} onCompare={toggleCompare} />
              ))}
            </div>
            {pageCount > 1 && (
              <div className="flex items-center justify-center gap-3 pt-1">
                <button disabled={cur === 0} onClick={() => setPage(cur - 1)} className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold disabled:opacity-40">‹ Trước</button>
                <span className="text-sm text-muted">Trang {cur + 1} / {pageCount}</span>
                <button disabled={cur >= pageCount - 1} onClick={() => setPage(cur + 1)} className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold disabled:opacity-40">Sau ›</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Nav({ category, step, onHome }: { category: Category; step: Step; onHome: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 h-16">
        <button onClick={onHome} className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-accent text-white">
            <Icon name="sparkles" size={18} />
          </span>
          <span className="font-head text-lg font-extrabold">DecisionDesk</span>
        </button>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted">
          <span className={cx("rounded-lg px-3 py-1.5", step !== "home" && "bg-accentSoft text-accent font-semibold")}>
            {step === "home" ? "Trang chủ" : `Tư vấn ${category === "laptop" ? "Laptop" : "Điện thoại"}`}
          </span>
        </div>
        <Badge tone="accent">
          <Icon name="sparkles" size={14} /> AHP · TOPSIS
        </Badge>
      </div>
    </header>
  );
}

function Home({ stats, onStart }: { stats: (c: Category) => ReturnType<typeof priceStats>; onStart: (c: Category) => void }) {
  const lp = stats("laptop"), ph = stats("phone");
  return (
    <div className="grid gap-10">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div className="grid gap-5">
          <Badge tone="accent"><Icon name="sparkles" size={16} /> Phương pháp AHP · TOPSIS</Badge>
          <h1 className="font-head text-4xl sm:text-5xl font-extrabold leading-[1.1]">
            Chọn đúng thiết bị.<br />Đúng nhu cầu. Đúng ngân sách.
          </h1>
          <p className="text-lg text-muted max-w-xl">
            Trợ lý giúp bạn tìm laptop hoặc điện thoại phù hợp nhất — dựa trên dữ liệu thực và xếp hạng
            khách quan bằng AHP (tính trọng số) + TOPSIS (xếp hạng).
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <button onClick={() => onStart("laptop")}
              className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-head font-bold text-white hover:bg-accentDark transition">
              <Icon name="laptop" /> Chọn Laptop
            </button>
            <button onClick={() => onStart("phone")}
              className="flex items-center gap-2 rounded-xl border-[1.5px] border-border bg-bg px-6 py-3.5 font-head font-bold hover:border-accent transition">
              <Icon name="smartphone" /> Chọn Điện thoại
            </button>
          </div>
        </div>
        <div className="relative aspect-[4/3] rounded-3xl bg-gradient-to-br from-accentSoft to-[#DDE3FB] grid place-items-center">
          <Icon name="laptop" size={140} className="text-[#9E97ED]" />
          <div className="absolute left-6 bottom-6 rounded-2xl bg-bg p-4 shadow-lg flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent font-head font-extrabold text-white text-sm">87%</span>
            <div>
              <div className="font-head font-bold text-sm">Phù hợp nhất</div>
              <div className="text-xs text-muted">Xếp hạng bằng TOPSIS</div>
            </div>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[["Laptop", lp.count.toLocaleString()], ["Điện thoại", ph.count.toLocaleString()],
          ["Giá TB laptop", money(avg("laptop"))], ["Giá TB điện thoại", money(avg("phone"))]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-surface p-5">
            <div className="text-sm text-muted">{l}</div>
            <div className="font-head text-2xl font-extrabold mt-1">{v}</div>
          </div>
        ))}
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[["target", "Phù hợp nhu cầu", "Gợi ý theo cách bạn thực sự dùng máy."],
          ["wallet", "Đúng ngân sách", "Lọc bỏ sản phẩm vượt giá trước khi xếp hạng."],
          ["chart", "Xếp hạng khách quan", "AHP tính trọng số (kèm CR), TOPSIS chấm điểm minh bạch."]].map(([ic, t, d]) => (
          <div key={t} className="rounded-2xl border border-border bg-bg p-6">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-accentSoft text-accent"><Icon name={ic} size={24} /></span>
            <div className="font-head font-bold text-lg mt-3">{t}</div>
            <p className="text-muted text-sm mt-1 leading-relaxed">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
function avg(c: Category) {
  const p = getProducts(c);
  return p.reduce((a, x) => a + x.price, 0) / p.length;
}

function Budget({ category, stats, budget, setBudget, onBack, onNext }: any) {
  const presets = category === "laptop"
    ? [[0, 700], [700, 1000], [1000, 1300], [1300, 1800], [1800, 9999]]
    : [[0, 200], [200, 350], [350, 550], [550, 800], [800, 9999]];
  return (
    <div className="max-w-2xl mx-auto grid gap-6">
      <StepHead step={1} onBack={onBack} title="Ngân sách của bạn là bao nhiêu?"
        sub="Chỉ những sản phẩm trong tầm giá mới được đưa vào xếp hạng." />
      <div className="rounded-2xl border border-border bg-bg p-6 grid gap-5">
        <div className="flex items-end justify-between">
          <span className="text-sm font-semibold text-muted">NGÂN SÁCH TỐI ĐA</span>
          <span className="font-head text-3xl font-extrabold text-accent">{money(budget)}</span>
        </div>
        <input type="range" min={Math.floor(stats.min)} max={Math.ceil(stats.max)} value={budget}
          onChange={(e) => setBudget(+e.target.value)} className="w-full" />
        <div className="flex justify-between text-xs text-faint">
          <span>{money(stats.min)}</span><span>{money(stats.max)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {presets.map(([lo, hi]) => {
          const active = budget === hi || (hi === 9999 && budget >= 1800);
          return (
            <button key={hi} onClick={() => setBudget(hi === 9999 ? Math.ceil(stats.max) : hi)}
              className={cx("rounded-xl border px-4 py-3 text-sm font-semibold transition",
                active ? "border-accent bg-accent text-white" : "border-border bg-surface hover:border-accent")}>
              {hi === 9999 ? `> ${money(lo)}` : lo === 0 ? `< ${money(hi)}` : `${money(lo)}–${money(hi)}`}
            </button>
          );
        })}
      </div>
      <NextBtn onClick={onNext} label="Tiếp tục" />
    </div>
  );
}

function Weights({ crit, pairs, pairIdx, setPairIdx, pairVal, setPairVal, ahpRes, weights, onBack, onNext }: any) {
  const [i, j] = pairs[pairIdx];
  const key = `${i}-${j}`;
  const k = pairVal[key] ?? 0;
  const a = crit[i], b = crit[j];
  const set = (v: number) => setPairVal((s: any) => ({ ...s, [key]: v }));
  const order = crit.map((c: any, idx: number) => ({ ...c, w: weights[c.key] }))
    .sort((x: any, y: any) => y.w - x.w);
  return (
    <div className="max-w-2xl mx-auto grid gap-6">
      <StepHead step={2} onBack={onBack} title="Tiêu chí nào quan trọng hơn?"
        sub="So sánh từng cặp tiêu chí. AHP dùng kết quả này để tính trọng số + kiểm tra tính nhất quán (CR)." />
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="font-semibold">Cặp {pairIdx + 1} / {pairs.length}</span>
        <div className="h-1.5 w-40 rounded-full bg-surface2 overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${((pairIdx + 1) / pairs.length) * 100}%` }} />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 grid gap-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className={cx("rounded-xl border-2 p-4 text-center", k < 0 ? "border-accent bg-accentSoft" : "border-border bg-bg")}>
            <div className="font-head font-bold">{a.label}</div><div className="text-xs text-faint">{a.hint}</div>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg text-xs font-bold text-faint">vs</span>
          <div className={cx("rounded-xl border-2 p-4 text-center", k > 0 ? "border-accent bg-accentSoft" : "border-border bg-bg")}>
            <div className="font-head font-bold">{b.label}</div><div className="text-xs text-faint">{b.hint}</div>
          </div>
        </div>
        <input type="range" min={-4} max={4} step={1} value={k} onChange={(e) => set(+e.target.value)} className="w-full" />
        <div className="flex justify-between text-xs">
          <span className="font-semibold text-accent">◀ {a.label} hơn</span>
          <span className="text-faint">Ngang nhau</span>
          <span className="font-semibold text-accent">{b.label} hơn ▶</span>
        </div>
        <div className="rounded-lg bg-accentSoft px-4 py-2.5 text-center text-sm font-semibold text-accentDark">
          {k === 0 ? "Hai tiêu chí ngang nhau"
            : `${(k < 0 ? a : b).label} ${saatyLabel(saaty(Math.abs(k)))}`}
        </div>
        <div className="flex gap-3">
          <button disabled={pairIdx === 0} onClick={() => setPairIdx((x: number) => x - 1)}
            className="flex-1 rounded-xl border-[1.5px] border-border py-3 font-head font-bold disabled:opacity-40">Cặp trước</button>
          {pairIdx < pairs.length - 1 ? (
            <button onClick={() => setPairIdx((x: number) => x + 1)}
              className="flex-1 rounded-xl bg-accent py-3 font-head font-bold text-white hover:bg-accentDark">Cặp tiếp theo</button>
          ) : (
            <button onClick={onNext} className="flex-1 rounded-xl bg-accent py-3 font-head font-bold text-white hover:bg-accentDark">Xem kết quả</button>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-bg p-5 grid gap-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 font-head font-bold text-sm">
            Trọng số AHP tạm tính
            <Info label="Công thức">
              <b>AHP</b> — trọng số từ ma trận so sánh cặp A (thang Saaty):<br />
              wᵢ = (∏ⱼ aᵢⱼ)^(1/n), chuẩn hoá Σw = 1<br />
              Nhất quán: <b>CR = CI / RI</b>, CI = (λmax − n)/(n − 1)<br />
              CR ≤ 0.1 ⇒ bộ so sánh chấp nhận được.
            </Info>
          </span>
          <Badge tone={ahpRes.consistent ? "success" : "muted"}>
            <Icon name={ahpRes.consistent ? "check" : "info"} size={14} />
            CR {ahpRes.cr.toFixed(2)} · {ahpRes.consistent ? "Nhất quán" : "Chưa nhất quán"}
          </Badge>
        </div>
        {order.map((c: any) => (
          <div key={c.key} className="flex items-center gap-3">
            <span className="w-28 text-sm text-muted">{c.label}</span>
            <Bar value={c.w * 100} />
            <span className="w-12 text-right font-head font-bold text-sm">{(c.w * 100).toFixed(0)}%</span>
          </div>
        ))}
        {!ahpRes.consistent && (
          <p className="text-xs text-danger">CR &gt; 0.10 — các so sánh mâu thuẫn nhau, nên điều chỉnh lại vài cặp.</p>
        )}
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Icon name="arrow" size={13} className="mt-0.5 shrink-0" />
          Bấm "Phân tích &amp; xếp hạng" để áp bộ trọng số này vào <b className="text-accent">TOPSIS</b> và xếp hạng sản phẩm.
        </p>
      </div>
      <NextBtn onClick={onNext} label="Phân tích & xếp hạng" />
    </div>
  );
}

function Results({ category, ranked, weights, crit, compareIds, toggleCompare, budget, setBudget, stats, onDetail, onCompare, onBack }: any) {
  const PAGE = 9;
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [ranked.length, category]);
  const topCrit = [...crit].sort((a: any, b: any) => weights[b.key] - weights[a.key]).slice(0, 3);
  const bnd = boundsOf(ranked, crit.map((c: any) => c.key));

  if (ranked.length === 0)
    return (
      <div className="max-w-xl mx-auto grid gap-5 py-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accentSoft text-accent"><Icon name="wallet" size={26} /></div>
        <h2 className="font-head text-2xl font-extrabold">Chưa có sản phẩm trong tầm giá</h2>
        <p className="text-muted">Kéo tăng ngân sách để thấy kết quả ngay — không cần quay lại.</p>
        <div className="rounded-2xl border border-border bg-bg p-6 grid gap-4 text-left">
          <div className="flex items-end justify-between">
            <span className="text-sm font-semibold text-muted">NGÂN SÁCH TỐI ĐA</span>
            <span className="font-head text-2xl font-extrabold text-accent">{money(budget)}</span>
          </div>
          <input type="range" min={Math.floor(stats.min)} max={Math.ceil(stats.max)} value={budget} onChange={(e) => setBudget(+e.target.value)} className="w-full" />
          <div className="flex justify-between text-xs text-faint"><span>{money(stats.min)}</span><span>{money(stats.max)}</span></div>
        </div>
        <button onClick={onBack} className="text-sm text-muted underline">Hoặc chỉnh lại tiêu chí</button>
      </div>
    );

  const rest = ranked.slice(1);
  const pageCount = Math.max(1, Math.ceil(rest.length / PAGE));
  const cur = Math.min(page, pageCount - 1);
  const pageItems = rest.slice(cur * PAGE, cur * PAGE + PAGE);

  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-head text-2xl font-extrabold flex items-center gap-1.5">
            Đề xuất cho bạn
            <Info label="Cách tính">
              <b>TOPSIS</b> — xếp hạng theo độ gần phương án lý tưởng:<br />
              rₖ = xₖ/√Σx² · vₖ = wₖ·rₖ · A⁺/A⁻ = lý tưởng tốt/xấu<br />
              <b>Điểm = C* = D⁻ / (D⁺ + D⁻) × 100</b><br />
              Trọng số wₖ lấy từ <b>AHP</b> ở bước trước.
            </Info>
          </h2>
          <p className="text-muted text-sm">{ranked.length} sản phẩm trong tầm giá · điểm % là <b>TOPSIS closeness</b> với trọng số AHP</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="rounded-xl border border-border bg-bg px-4 py-2.5 text-sm font-semibold">Chỉnh tiêu chí</button>
          {compareIds.length >= 2 && (
            <button onClick={onCompare} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white">
              <Icon name="compare" size={16} /> So sánh ({compareIds.length})
            </button>
          )}
        </div>
      </div>
      {cur === 0 && <HeroCard r={ranked[0]} topCrit={topCrit} category={category} bnd={bnd}
        selected={compareIds.includes(ranked[0].item.id)} onDetail={onDetail} onCompare={toggleCompare} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map((r: Ranked<Product>) => (
          <RankCard key={r.item.id} r={r} topCrit={topCrit} bnd={bnd}
            selected={compareIds.includes(r.item.id)} onDetail={onDetail} onCompare={toggleCompare} />
        ))}
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button disabled={cur === 0} onClick={() => setPage(cur - 1)} className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold disabled:opacity-40">‹ Trước</button>
          <span className="text-sm text-muted">Trang {cur + 1} / {pageCount}</span>
          <button disabled={cur >= pageCount - 1} onClick={() => setPage(cur + 1)} className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold disabled:opacity-40">Sau ›</button>
        </div>
      )}
    </div>
  );
}

function HeroCard({ r, topCrit, category, bnd, selected, onDetail, onCompare }: any) {
  const p = r.item as Product;
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-accent bg-bg">
      <div className="grid md:grid-cols-[300px_1fr]">
        <div className="relative h-44 md:h-auto bg-gradient-to-br from-accentSoft to-[#DDE3FB] grid place-items-center">
          <Icon name={category === "laptop" ? "laptop" : "smartphone"} size={90} className="text-[#8E8AE8]" />
          <div className="absolute left-4 top-4"><Badge tone="accent"><Icon name="trophy" size={14} /> Phù hợp nhất</Badge></div>
        </div>
        <div className="p-6 grid gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold tracking-wide text-faint">{p.brand.toUpperCase()}</div>
              <h3 className="font-head text-xl font-extrabold leading-tight">{p.product}</h3>
              <div className="font-head text-2xl font-extrabold text-accent mt-1">{money(p.price)}</div>
            </div>
            <div className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-2xl bg-accentSoft text-center">
              <div><div className="font-head text-2xl font-extrabold text-accent">{r.score.toFixed(0)}%</div>
                <div className="text-[9px] font-semibold tracking-wide text-accent">MATCH</div></div>
            </div>
          </div>
          <div className="grid gap-2">
            {topCrit.map((c: any) => (
              <div key={c.key} className="flex items-center gap-3">
                <span className="w-24 text-sm text-muted">{c.label}</span>
                <Bar value={barPct(r.normalized[c.key], bnd[c.key], c.cost)} tone="success" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => onCompare(p.id)}
              className={cx("flex-1 rounded-xl border-[1.5px] py-3 font-head font-bold transition",
                selected ? "border-accent bg-accentSoft text-accent" : "border-border")}>
              {selected ? "Đã thêm ✓" : "So sánh"}
            </button>
            <button onClick={() => onDetail(p)} className="flex-1 rounded-xl bg-accent py-3 font-head font-bold text-white hover:bg-accentDark">Xem chi tiết</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankCard({ r, topCrit, bnd, selected, onDetail, onCompare }: any) {
  const p = r.item as Product;
  return (
    <div className="rounded-2xl border border-border bg-bg p-4 grid gap-3">
      <div className="flex items-start justify-between">
        <span className="grid h-9 min-w-9 px-2 place-items-center rounded-full bg-ink text-sm font-extrabold text-white">#{r.rank}</span>
        <span className="rounded-full bg-accentSoft px-2.5 py-1 font-head text-sm font-extrabold text-accent">{r.score.toFixed(0)}%</span>
      </div>
      <div>
        <div className="text-[11px] font-semibold tracking-wide text-faint">{p.brand.toUpperCase()}</div>
        <div className="font-head font-bold leading-tight line-clamp-2">{p.product}</div>
        <div className="font-head font-bold text-accent mt-1">{money(p.price)}</div>
      </div>
      <div className="grid gap-1.5">
        {topCrit.slice(0, 2).map((c: any) => (
          <div key={c.key} className="flex items-center gap-2">
            <span className="w-8 text-[11px] text-faint">{c.label.slice(0, 3)}</span>
            <Bar value={barPct(r.normalized[c.key], bnd[c.key], c.cost)} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onCompare(p.id)}
          className={cx("flex-1 rounded-lg py-2 text-sm font-bold", selected ? "bg-accentSoft text-accent" : "bg-surface")}>
          {selected ? "Đã thêm ✓" : "So sánh"}
        </button>
        <button onClick={() => onDetail(p)} className="flex-1 rounded-lg bg-surface py-2 text-sm font-bold">Chi tiết</button>
      </div>
    </div>
  );
}

function Detail({ p, ranked, weights, category, ahpRes, onClose }: any) {
  const r = ranked.find((x: Ranked<Product>) => x.item.id === p.id);
  const crit = CRITERIA[category as Category];
  const topW = [...crit].sort((a, b) => weights[b.key] - weights[a.key])[0];
  const bnd = boundsOf(ranked, crit.map((c) => c.key));
  return (
    <Overlay onClose={onClose} title="Chi tiết sản phẩm">
      <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
        <div className="grid gap-4">
          <div className="h-52 rounded-2xl bg-gradient-to-br from-accentSoft to-[#D7DEFA] grid place-items-center">
            <Icon name={category === "laptop" ? "laptop" : "smartphone"} size={110} className="text-[#7C77E0]" />
          </div>
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 font-head font-extrabold">Thông số kỹ thuật</div>
            {Object.entries(p.raw).map(([k, v], idx) => (
              <div key={k} className={cx("flex justify-between px-4 py-3 text-sm", idx % 2 === 0 && "bg-surface")}>
                <span className="text-muted capitalize">{specLabel(k)}</span>
                <span className="font-semibold">{v as string}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 content-start">
          <div>
            <div className="text-xs font-semibold tracking-wide text-faint">{p.brand.toUpperCase()} · {category === "laptop" ? "Laptop" : "Điện thoại"}</div>
            <h3 className="font-head text-2xl font-extrabold">{p.product}</h3>
            <div className="font-head text-2xl font-extrabold text-accent">{money(p.price)}</div>
          </div>
          <div className="rounded-2xl border border-border bg-bg p-5 grid gap-4">
            <div className="flex items-center gap-4">
              <Ring pct={r?.score ?? 0} size={88} />
              <div>
                <div className="font-head font-bold">Độ phù hợp tổng thể</div>
                <div className="text-sm text-muted">Hạng #{r?.rank} trong {ranked.length} sản phẩm phù hợp.</div>
              </div>
            </div>
            <div className="grid gap-2">
              {crit.map((c) => (
                <div key={c.key} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-muted">{c.label}</span>
                  <Bar value={barPct(r?.normalized[c.key] ?? 0, bnd[c.key], c.cost)} tone={c.cost ? "accent" : "success"} />
                  <span className="w-10 text-right text-xs font-bold">{barPct(r?.normalized[c.key] ?? 0, bnd[c.key], c.cost).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-faint flex gap-1.5"><Icon name="info" size={13} />
              Điểm tiêu chí do hệ thống tính từ dữ liệu; một số tiêu chí (Pin, Tính di động, Camera…) được ước lượng từ cấu hình.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[["Trọng số cao nhất", `${topW.label} · ${(weights[topW.key] * 100).toFixed(0)}%`],
              ["Điểm phù hợp (TOPSIS)", `${r?.score.toFixed(1)}%`],
              ["Chỉ số nhất quán (CR)", ahpRes.cr.toFixed(3)],
              ["Thứ hạng", `#${r?.rank} / ${ranked.length}`]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-accentSoft p-3">
                <div className="text-xs font-semibold text-accentDark">{l}</div>
                <div className="font-head font-extrabold mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Overlay>
  );
}

function Compare({ ranked, category, onClose }: any) {
  const crit = CRITERIA[category as Category];
  const rows = ranked as Ranked<Product>[];
  return (
    <Overlay onClose={onClose} title="So sánh sản phẩm" wide>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left p-3"></th>
              {rows.map((r) => (
                <th key={r.item.id} className="p-3 align-bottom min-w-[130px]">
                  <div className="font-head font-bold">{r.item.brand}</div>
                  <div className="text-xs text-muted line-clamp-2">{r.item.product}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Giá" cells={rows.map((r) => money(r.item.price))}
              best={argmin(rows.map((r) => r.item.price))} />
            {crit.filter((c) => c.key !== "price").map((c) => (
              <Row key={c.key} label={c.label}
                cells={rows.map((r) => String(critFmt(c.key, r.item.criteria[c.key])))}
                best={c.cost ? argmin(rows.map((r) => r.item.criteria[c.key])) : argmax(rows.map((r) => r.item.criteria[c.key]))} />
            ))}
            <Row label="Điểm phù hợp" emph cells={rows.map((r) => `${r.score.toFixed(0)}%`)}
              best={argmax(rows.map((r) => r.score))} />
          </tbody>
        </table>
      </div>
    </Overlay>
  );
}
function Row({ label, cells, best, emph }: { label: string; cells: string[]; best: number; emph?: boolean }) {
  return (
    <tr className={cx(emph ? "bg-accentSoft" : "odd:bg-surface")}>
      <td className={cx("p-3 font-medium", emph ? "text-accentDark font-bold" : "text-muted")}>{label}</td>
      {cells.map((v, i) => (
        <td key={i} className="p-3 text-center">
          <span className={cx("inline-block rounded-lg px-2 py-1",
            i === best && !emph && "bg-successSoft text-[#0A7A47] font-bold",
            emph && "font-head font-extrabold text-accent")}>
            {v}{i === best && !emph ? " ★" : ""}
          </span>
        </td>
      ))}
    </tr>
  );
}

// --- shared bits ---
function StepHead({ step, title, sub, onBack }: any) {
  return (
    <div className="grid gap-3">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-muted w-fit">
        <Icon name="back" size={18} /> Quay lại
      </button>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-bold text-accent">Bước {step} / 3</span>
      </div>
      <h2 className="font-head text-2xl sm:text-3xl font-extrabold leading-tight">{title}</h2>
      <p className="text-muted">{sub}</p>
    </div>
  );
}
function NextBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="flex items-center justify-center gap-2 rounded-xl bg-accent py-4 font-head font-bold text-white hover:bg-accentDark transition">
      {label} <Icon name="arrow" size={20} />
    </button>
  );
}
function Overlay({ children, title, onClose, wide }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm p-4 sm:p-8 overflow-y-auto" onClick={onClose}>
      <div className={cx("mx-auto rounded-3xl bg-bg p-6 sm:p-8", wide ? "max-w-4xl" : "max-w-3xl")} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-head text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-surface"><Icon name="x" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
const specLabel = (k: string) =>
  ({ cpu: "CPU", ram: "RAM", gpu: "Đồ hoạ", storage: "Ổ cứng", screen: "Màn hình", touch: "Cảm ứng",
    status: "Tình trạng", brand: "Hãng", model: "Model", color: "Màu", free: "Máy trần" } as any)[k] || k;
const argmax = (a: number[]) => a.indexOf(Math.max(...a));
const argmin = (a: number[]) => a.indexOf(Math.min(...a));

type Bounds = Record<string, { min: number; max: number }>;
function boundsOf(ranked: Ranked<Product>[], keys: string[]): Bounds {
  const b: Bounds = {};
  keys.forEach((k) => {
    const vs = ranked.map((r) => r.normalized[k]);
    b[k] = { min: Math.min(...vs), max: Math.max(...vs) };
  });
  return b;
}
// Scale a normalized criterion value to 0..100 within the current result set
// (inverting cost criteria so "higher bar = better") for readable bars.
function barPct(v: number, b: { min: number; max: number } | undefined, cost: boolean) {
  if (!b || b.max === b.min) return 60;
  const t = (v - b.min) / (b.max - b.min);
  return (cost ? 1 - t : t) * 100;
}
const critFmt = (key: string, v: number) => (key === "storageRam" ? Math.round(v) : Math.round(v * 10) / 10);
