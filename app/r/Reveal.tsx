"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { characterSrc, colorOf, PALETTE } from "@/lib/colors";
import { MAX_SLOTS, playGame, type Fortune, type Grade } from "@/lib/fortune";
import { decodeGame, encodeGame, type GameState } from "@/lib/game-url";

const STICKER: Record<Grade, string> = { 대길: "sticker-top", 길: "sticker-mid", 평: "sticker-low" };
// 뽑는 중에는 당첨자가 정해지기 전이라 점수 구간으로만 보여준다(대길은 결과에서만)
const liveGrade = (f: Fortune): Grade => (f.score >= 50 ? "길" : "평");
const byScore = (a: Fortune, b: Fortune) => b.score - a.score || b.tie - a.tie || a.slot - b.slot;

function Sticker({ grade, small = false }: { grade: Grade; small?: boolean }) {
  return <span className={`sticker ${STICKER[grade]} ${small ? "sticker-sm" : ""}`}>{grade}</span>;
}

function LeaderBadge({ f }: { f: Fortune }) {
  const c = colorOf(f.slot);
  return (
    <div className="ink3 sh4 flex h-11 -rotate-2 items-center gap-2 rounded-xl bg-gold px-3.5 text-sm">
      <span className="num ink3 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs" style={{ background: c.hex, color: c.ink ? "#111" : "#fff" }}>{f.slot}</span>
      1등 {f.score}점
    </div>
  );
}

function Character({ slot, w, h, className = "" }: { slot: number; w: number; h: number; className?: string }) {
  return <Image src={characterSrc(slot)} alt={colorOf(slot).animal} width={w} height={h} className={`ink3 rounded-lg bg-paper object-cover ${className}`} style={{ width: w, height: h }} />;
}

// 부채꼴: 남은 카드를 호 위에 고르게. 자리(pos)는 카드의 정체라 key로 유지한다.
function Fan({ remaining, onPick }: { remaining: number[]; onPick: (pos: number) => void }) {
  const k = remaining.length;
  const spread = Math.min(84, 11 * (k - 1)); // 전체 각도
  return (
    <div className="relative h-[190px]">
      {remaining.map((pos, i) => {
        const angle = k === 1 ? 0 : -spread / 2 + (spread * i) / (k - 1);
        return (
          <button
            key={pos}
            type="button"
            onClick={() => onPick(pos)}
            aria-label={`${i + 1}번째 카드 뽑기`}
            className="ink4 sh4 stripes absolute left-1/2 top-2 h-[110px] w-[74px] -ml-[37px] rounded-[12px] bg-ink"
            style={{ transform: `rotate(${angle}deg)`, transformOrigin: "50% 320px", transition: "transform 0.35s cubic-bezier(0.2,0.8,0.2,1.1)", backgroundImage: "repeating-linear-gradient(-45deg, rgba(255,255,255,0.12) 0 10px, transparent 10px 20px)" }}
          >
            <span className="num ink2 mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-gold text-lg text-ink">?</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Reveal() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = useMemo(() => decodeGame(params), [params]);
  const result = useMemo(() => (state ? playGame(state) : null), [state]);
  const [copied, setCopied] = useState(false);
  const confettiDone = useRef(false);

  // 손가락 모드 링크는 바로 결과. 뽑기 모드는 "끝"을 눌러야 결과.
  const showResult = !!state && !!result && result.winner !== null && (state.mode === "f" || state.finished);

  // 결과 화면에 들어올 때 컨페티 한 번. 뽑기 모드는 "끝" 탭 순간에도 바로 터뜨린다(URL 갱신을 기다리지 않게).
  function fireConfetti() {
    if (confettiDone.current) return;
    confettiDone.current = true;
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({ particleCount: 140, spread: 75, origin: { y: 0.35 }, colors: [...PALETTE, "#FFC400"], scalar: 1.1 });
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: [...PALETTE, "#FFC400"] }), 250);
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: [...PALETTE, "#FFC400"] }), 400);
    });
  }
  useEffect(() => {
    if (showResult) fireConfetti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult]);

  if (!state || !result) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <p className="text-lg">링크가 이상해요.</p>
        <Link href="/" className="btn-big flex w-full items-center justify-center rounded-2xl">새로 시작하기</Link>
      </section>
    );
  }

  const { fortunes, ranking, winner, tied, dayEvent } = result;
  const update = (patch: Partial<GameState>) => router.replace(`${pathname}?${encodeGame({ ...state, ...patch })}`);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  // 1) 뽑기 모드: 부채꼴에서 직접 고르기
  if (state.mode === "d" && !state.finished) {
    const sorted = fortunes.slice().sort(byScore);
    const top = sorted[0] ?? null;
    const latest = fortunes.length ? fortunes[fortunes.length - 1].slot : null;
    const remaining = Array.from({ length: MAX_SLOTS }, (_, i) => i + 1).filter((p) => !state.picks.includes(p));
    return (
      <section className="flex flex-1 flex-col">
        <div className="flex items-end justify-between">
          <h1 className="title whitespace-pre-line text-[38px]">{"카드\n뽑기"}</h1>
          {top && <LeaderBadge f={top} />}
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs text-[#555]">
          <span>{fortunes.length ? `${fortunes.length}장 뽑음, 점수순` : "첫 번째 사람부터 아무 카드나"}</span>
          {dayEvent && <span>{dayEvent}</span>}
        </div>
        <ul className="mt-2 flex flex-col gap-3 pr-1.5">
          {sorted.map((f, i) => {
            const c = colorOf(f.slot);
            const isTop = i === 0;
            const isLatest = f.slot === latest;
            return (
              <li key={f.slot} className={`ink4 relative flex h-[92px] overflow-hidden rounded-2xl bg-paper ${isTop ? "sh5g" : "sh5"} ${isLatest ? "pop" : ""}`}>
                {isTop && <span className="absolute -top-1 right-3.5 rounded-b-lg border-[3px] border-t-0 border-ink bg-gold px-2.5 py-0.5 text-[11px]">1등</span>}
                <div className="flex w-[66px] flex-col items-center justify-center gap-0.5 border-r-4 border-ink" style={{ background: c.hex, color: c.ink ? "#111" : "#fff" }}>
                  <span className="num text-2xl leading-none">{f.slot}</span>
                  <Character slot={f.slot} w={38} h={46} className="rounded-[7px]" />
                </div>
                <div className="flex flex-1 items-center justify-between gap-2 pl-3 pr-3.5">
                  <div className="flex flex-col gap-1">
                    <div><Sticker grade={liveGrade(f)} /></div>
                    {isLatest && <span className="text-[11px] text-[#555]">방금 나옴</span>}
                  </div>
                  <span className="num text-[44px] leading-none">{f.score}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between pr-1.5">
            <span className="text-xs text-[#555]">남은 카드 {remaining.length}장</span>
            {fortunes.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  fireConfetti();
                  update({ finished: true });
                }}
                className="btn-small press h-11 px-5"
              >
                끝, 누가 쏘나
              </button>
            )}
          </div>
          {remaining.length > 0 ? <Fan remaining={remaining} onPick={(pos) => update({ picks: [...state.picks, pos] })} /> : <p className="py-10 text-center text-sm text-[#555]">다 뽑았어요</p>}
        </div>
      </section>
    );
  }

  // 2) 결과
  if (winner === null) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <p className="text-lg">두 명은 있어야 해요.</p>
        <Link href="/" className="btn-big flex w-full items-center justify-center rounded-2xl">새로 시작하기</Link>
      </section>
    );
  }
  const w = fortunes[winner - 1];
  const wc = colorOf(w.slot);
  const others = ranking.slice(1).map((s) => fortunes[s - 1]);
  return (
    <section className="relative flex flex-1 flex-col">
      <span className="ink2 pointer-events-none absolute left-4 top-20 h-[18px] w-2.5 rotate-[25deg] bg-[#E53935]" />
      <span className="ink2 pointer-events-none absolute right-5 top-16 h-[18px] w-2.5 -rotate-[30deg] bg-[#1E63E9]" />
      <span className="ink2 pointer-events-none absolute right-2 top-[280px] h-3 w-3 rounded-full bg-[#2BB24C]" />
      <span className="ink2 pointer-events-none absolute left-7 top-[300px] h-[18px] w-2.5 rotate-[60deg] bg-[#FF4FA3]" />

      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="num -rotate-2 rounded-md bg-ink px-2.5 py-1 text-xs tracking-[2px] text-gold">WINNER</span>
        <h1 className="title text-[36px]">오늘 베푸는 사람</h1>
      </div>

      <div className="ink4 sh8 relative mr-1.5 mt-5 flex flex-col gap-2.5 rounded-[22px] bg-gold px-4 pb-3.5 pt-4">
        <span className="ink3 sh3 absolute -top-[18px] right-3.5 rotate-6 rounded-[10px] bg-paper px-3.5 py-1 text-lg">대길</span>
        <div className="flex items-center gap-3.5">
          <Character slot={w.slot} w={110} h={140} className="ink4 sh4 rounded-[14px]" />
          <div className="flex flex-1 flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="num text-[40px] leading-none">{w.slot}</span>
              <span className="text-base">{wc.name}{w.label ? ` ${w.label}` : ""}</span>
            </div>
            <div className="num text-[84px] leading-[0.95] tracking-[-2px]">
              {w.score}
              {tied && <span className="text-[28px] text-[#E53935]">.{w.tie}</span>}
            </div>
            <span className="text-xs text-[#4a3a00]">점, 오늘 운세 1등</span>
          </div>
        </div>
        <p className="ink3 rounded-xl bg-paper px-3 py-2 text-center text-[15px] leading-snug">{w.message}</p>
      </div>

      {!w.label && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
            if (name) update({ labels: { ...state.labels, [w.slot]: name } });
          }}
          className="mr-1.5 mt-4 flex gap-2"
        >
          <input name="name" maxLength={10} placeholder="당첨자 이름 적기 (선택)" className="ink3 h-11 flex-1 rounded-xl bg-paper px-3.5 text-sm" />
          <button className="ink3 press h-11 rounded-xl bg-gold px-4 text-sm">적기</button>
        </form>
      )}

      <ul className="mr-1.5 mt-5 flex flex-col gap-2">
        {others.map((f, i) => {
          const c = colorOf(f.slot);
          return (
            <li key={f.slot} className="ink3 sh3 flex h-[50px] items-center gap-2.5 overflow-hidden rounded-xl bg-paper pr-3">
              <span className="num flex h-full w-11 items-center justify-center border-r-[3px] border-ink text-lg" style={{ background: c.hex, color: c.ink ? "#111" : "#fff" }}>{f.slot}</span>
              <Character slot={f.slot} w={28} h={36} className="ink2 rounded-md" />
              <span className="flex-1 text-sm">{c.name}{f.label ? ` ${f.label}` : ""}</span>
              <Sticker grade={f.grade} small />
              <span className="num w-11 text-right text-[22px]">
                {f.score}
                {tied && i === 0 && <span className="text-[11px] text-[#555]">.{f.tie}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mr-1.5 mt-auto flex flex-col gap-2.5 pt-6">
        <div className="flex gap-2.5">
          <button type="button" onClick={copyLink} className="btn-small press flex-1">{copied ? "복사됨!" : "링크 복사"}</button>
          <button type="button" disabled title="준비 중" className="btn-small flex-1 opacity-40">이미지 저장</button>
          <button type="button" disabled title="준비 중" className="btn-small flex-1 bg-kakao opacity-40">카카오</button>
        </div>
        <Link href="/" className="btn-big flex items-center justify-center rounded-2xl">다시 하기</Link>
        <p className="text-center text-xs text-[#555]">링크를 열면 같은 카드가 보여요</p>
      </div>
    </section>
  );
}
