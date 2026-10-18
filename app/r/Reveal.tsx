"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { characterSrc, colorOf, PALETTE } from "@/lib/colors";
import { MAX_SLOTS, playGame, type Fortune, type Grade } from "@/lib/fortune";
import { decodeGame, encodeGame, type GameState } from "@/lib/game-url";

const STICKER: Record<Grade, string> = { 대길: "sticker-top", 길: "sticker-mid", 평: "sticker-low" };
// 공개 중에는 당첨자가 정해지기 전이라 점수 구간으로만 보여준다(대길은 결과에서만)
const liveGrade = (f: Fortune): Grade => (f.score >= 50 ? "길" : "평");
const byScore = (a: Fortune, b: Fortune) => b.score - a.score || b.tie - a.tie || a.slot - b.slot;

function Sticker({ grade, small = false }: { grade: Grade; small?: boolean }) {
  return <span className={`sticker ${STICKER[grade]} ${small ? "sticker-sm" : ""}`}>{grade}</span>;
}

function LeaderBadge({ f }: { f: Fortune }) {
  const c = colorOf(f.slot);
  return (
    <div className="ink3 sh4 flex h-11 -rotate-2 items-center gap-2 rounded-xl bg-gold px-3.5 text-sm">
      <span className="num ink3 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs" style={{ background: c.hex, color: c.ink ? "#111" : "#fff" }}>
        {f.slot}
      </span>
      1등 {f.score}점
    </div>
  );
}

function Character({ slot, w, h, className = "" }: { slot: number; w: number; h: number; className?: string }) {
  return <Image src={characterSrc(slot)} alt={colorOf(slot).animal} width={w} height={h} className={`ink3 rounded-lg bg-paper object-cover ${className}`} style={{ width: w, height: h }} />;
}

export default function Reveal() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = useMemo(() => decodeGame(params), [params]);
  const result = useMemo(() => (state ? playGame(state) : null), [state]);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const confettiDone = useRef(false);

  const showResult = !!state && !!result && result.winner !== null && (state.mode === "d" ? state.finished : flipped.size >= result.fortunes.length);

  // 결과 화면 진입 시 컨페티 한 번
  useEffect(() => {
    if (!showResult || confettiDone.current) return;
    confettiDone.current = true;
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({ particleCount: 140, spread: 75, origin: { y: 0.35 }, colors: [...PALETTE, "#FFC400"], scalar: 1.1 });
    });
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

  // 1) 손가락 모드: 카드 뒤집기
  if (state.mode === "f" && !showResult) {
    const open = fortunes.filter((f) => flipped.has(f.slot)).sort(byScore);
    const top = open[0] ?? null;
    const lastOne = fortunes.length - flipped.size === 1;
    return (
      <section className="flex flex-1 flex-col">
        <div className="flex items-end justify-between">
          <h1 className="title whitespace-pre-line text-[38px]">{lastOne ? "마지막\n한 장" : "자기 번호\n뒤집어"}</h1>
          {top && <LeaderBadge f={top} />}
        </div>
        {dayEvent && <p className="mt-2 text-xs text-[#555]">{dayEvent}</p>}
        <ul className="mt-6 flex flex-col gap-4 pr-1.5">
          {fortunes.map((f) => {
            const c = colorOf(f.slot);
            const isOpen = flipped.has(f.slot);
            const isTop = isOpen && top?.slot === f.slot;
            const isLast = !isOpen && lastOne;
            return (
              <li key={f.slot} className="flip h-[116px]">
                <div className={`flip-inner h-full ${isOpen ? "is-open" : ""}`}>
                  {/* 뒷면 */}
                  <button
                    type="button"
                    disabled={isOpen}
                    onClick={() => setFlipped(new Set(flipped).add(f.slot))}
                    className={`flip-face ink4 sh6 stripes flex items-center justify-between rounded-[18px] px-[18px] ${isLast ? "wiggle" : ""}`}
                    style={{ background: c.hex, color: c.ink ? "#111" : "#fff" }}
                    aria-label={`${f.slot}번 카드 뒤집기`}
                  >
                    {isLast && <span className="absolute -top-4 left-4 rounded-lg border-[3px] border-ink bg-ink px-2.5 py-0.5 text-xs tracking-wide text-gold">마지막 한 장!</span>}
                    <span className="flex items-baseline gap-3">
                      <span className="num text-[76px] leading-none" style={{ textShadow: "4px 4px 0 #111" }}>{f.slot}</span>
                      <span className="text-[15px]">{c.name}</span>
                    </span>
                    <span className={`ink3 sh3 rounded-[10px] px-3.5 py-2 text-base text-ink ${isLast ? "bg-gold" : "bg-paper"}`}>탭!</span>
                  </button>
                  {/* 앞면 */}
                  <div className={`flip-face flip-back ink4 flex overflow-hidden rounded-[18px] bg-paper ${isTop ? "sh6g" : "sh6"}`}>
                    {isTop && <span className="absolute -top-1 right-3.5 rounded-b-lg border-[3px] border-t-0 border-ink bg-gold px-2.5 py-0.5 text-xs">1등</span>}
                    <div className="flex w-20 flex-col items-center justify-center gap-1 border-r-4 border-ink" style={{ background: c.hex, color: c.ink ? "#111" : "#fff" }}>
                      <span className="num text-[30px] leading-none">{f.slot}</span>
                      <Character slot={f.slot} w={46} h={58} />
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-2 pl-3 pr-3.5">
                      <div className="flex flex-col gap-1.5">
                        <div><Sticker grade={liveGrade(f)} /></div>
                        <p className="text-xs leading-snug text-[#555]">{f.message}</p>
                      </div>
                      <span className="num text-[50px] leading-none">{f.score}</span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  // 2) 뽑기 모드: 더미에서 한 장씩
  if (state.mode === "d" && !state.finished) {
    const sorted = fortunes.slice().sort(byScore);
    const top = sorted[0] ?? null;
    const latest = fortunes.length ? fortunes[fortunes.length - 1].slot : null;
    const left = MAX_SLOTS - fortunes.length;
    return (
      <section className="flex flex-1 flex-col">
        <div className="flex items-end justify-between">
          <h1 className="title whitespace-pre-line text-[38px]">{"한 명씩\n뽑기"}</h1>
          {top && <LeaderBadge f={top} />}
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs text-[#555]">
          <span>{fortunes.length ? `${fortunes.length}장 뽑음, 점수순` : "첫 번째 사람이 더미를 탭"}</span>
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
        <div className="mt-auto flex items-stretch gap-3 pr-1.5 pt-6">
          <div className="relative flex-1">
            <div className="ink4 absolute inset-x-0 bottom-[-6px] h-32 -rotate-2 rounded-[18px] bg-[#ddd]" />
            <div className="ink4 absolute inset-x-0 bottom-[-2px] h-32 rotate-[1.5deg] rounded-[18px] bg-[#eee]" />
            <button
              type="button"
              disabled={left <= 0}
              onClick={() => update({ count: state.count + 1 })}
              className="ink4 sh6g stripes-light relative flex h-32 w-full items-center justify-center gap-3.5 rounded-[18px] bg-ink disabled:opacity-40"
              aria-label="더미에서 카드 뽑기"
            >
              <span className="num ink3 flex h-16 w-16 items-center justify-center rounded-full bg-gold text-[34px] text-ink">?</span>
              <span className="text-left leading-[1.15] text-gold">
                <span className="block text-xl">{left > 0 ? "탭해서 뽑기" : "다 뽑았어요"}</span>
                <span className="block text-xs text-paper">남은 카드 {left}장</span>
              </span>
            </button>
          </div>
          <button
            type="button"
            disabled={fortunes.length < 2}
            onClick={() => update({ finished: true })}
            className="ink4 h-32 w-[104px] rounded-[18px] bg-paper text-2xl disabled:opacity-40"
            style={{ boxShadow: "0 6px 0 #111" }}
          >
            끝
          </button>
        </div>
      </section>
    );
  }

  // 3) 결과
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
      {/* 장식 */}
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
