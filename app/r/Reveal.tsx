"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { colorOf } from "@/lib/colors";
import { displayName, MAX_SLOTS, playGame, type Fortune } from "@/lib/fortune";
import { decodeGame, encodeGame, type GameState } from "@/lib/game-url";

// 손가락 모드: 카드 n장 뒷면 -> 각자 탭해서 뒤집기 -> 다 뒤집히면 결과
// 뽑기 모드: 더미 탭마다 한 장 -> "끝" -> 결과
// 애니메이션은 디자인 확정 후 Motion으로.
export default function Reveal() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = useMemo(() => decodeGame(params), [params]);
  const result = useMemo(() => (state ? playGame(state) : null), [state]);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  if (!state || !result) {
    return (
      <section className="pt-16 text-center">
        <p className="font-semibold">링크가 이상해요.</p>
        <Link href="/" className="mt-6 inline-block rounded-2xl bg-accent px-6 py-3 font-bold text-white">
          새로 시작하기
        </Link>
      </section>
    );
  }

  const { fortunes, ranking, winner, tied, dayEvent } = result;
  const update = (patch: Partial<GameState>) => router.replace(`${pathname}?${encodeGame({ ...state, ...patch })}`);

  const leader = (pool: Fortune[]) => pool.slice().sort((a, b) => b.score - a.score || b.tie - a.tie || a.slot - b.slot)[0];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const header = (
    <div>
      <p className="text-sm font-semibold text-accent">{state.date}</p>
      {dayEvent && <p className="mt-1 text-xs opacity-60">{dayEvent}</p>}
    </div>
  );

  // 1) 손가락 모드: 카드 뒤집기
  if (state.mode === "f" && flipped.size < fortunes.length) {
    const open = fortunes.filter((f) => flipped.has(f.slot));
    const top = open.length ? leader(open) : null;
    const lastOne = fortunes.length - flipped.size === 1;
    return (
      <section className="flex flex-1 flex-col">
        {header}
        <h1 className="mt-2 text-2xl font-black">{lastOne ? "마지막 한 장" : "자기 카드를 뒤집어"}</h1>
        <p className="mt-1 h-5 text-sm opacity-60">{top ? `지금 1등: ${displayName(top)} ${top.score}점` : ""}</p>
        <ul className="mt-6 grid grid-cols-2 gap-3">
          {fortunes.map((f) => {
            const isOpen = flipped.has(f.slot);
            return (
              <li key={f.slot}>
                <button
                  onClick={() => setFlipped(new Set(flipped).add(f.slot))}
                  disabled={isOpen}
                  className="w-full rounded-2xl p-4 text-left text-white"
                  style={{ background: colorOf(f.slot).hex }}
                >
                  <div className="text-4xl font-black">{f.slot}</div>
                  <div className="text-xs opacity-80">{colorOf(f.slot).name}</div>
                  <div className="mt-2 min-h-10 text-sm">
                    {isOpen ? (
                      <>
                        <span className="text-2xl font-black">{f.score}</span>
                        <p className="mt-1 leading-snug opacity-90">{f.message}</p>
                      </>
                    ) : (
                      <span className="opacity-60">탭해서 뒤집기</span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  // 2) 뽑기 모드: 더미에서 한 장씩
  if (state.mode === "d" && !state.finished) {
    const top = fortunes.length ? leader(fortunes) : null;
    const full = fortunes.length >= MAX_SLOTS;
    return (
      <section className="flex flex-1 flex-col">
        {header}
        <h1 className="mt-2 text-2xl font-black">한 명씩 뽑기</h1>
        <p className="mt-1 h-5 text-sm opacity-60">{top ? `지금 1등: ${displayName(top)} ${top.score}점` : "첫 번째 사람이 더미를 탭"}</p>
        <button
          onClick={() => !full && update({ count: state.count + 1 })}
          disabled={full}
          className="mt-6 flex h-40 items-center justify-center rounded-3xl bg-foreground text-xl font-bold text-white disabled:opacity-30"
        >
          {full ? "10장 다 뽑았어요" : "탭해서 뽑기"}
        </button>
        <ul className="mt-4 flex flex-col gap-2">
          {fortunes
            .slice()
            .reverse()
            .map((f) => (
              <li key={f.slot} className="flex items-center gap-3 rounded-2xl bg-black/5 px-3 py-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full font-black text-white" style={{ background: colorOf(f.slot).hex }}>
                  {f.slot}
                </span>
                <span className="flex-1 text-sm leading-snug">{f.message}</span>
                <span className="text-xl font-black">{f.score}</span>
              </li>
            ))}
        </ul>
        {fortunes.length >= 2 && (
          <button onClick={() => update({ finished: true })} className="mt-auto rounded-2xl bg-accent py-4 text-lg font-bold text-white">
            끝. 누가 쏘나 보기
          </button>
        )}
      </section>
    );
  }

  // 3) 결과
  if (winner === null) {
    return (
      <section className="pt-16 text-center">
        <p className="font-semibold">두 명은 있어야 해요.</p>
        <Link href="/" className="mt-6 inline-block rounded-2xl bg-accent px-6 py-3 font-bold text-white">
          새로 시작하기
        </Link>
      </section>
    );
  }
  const w = fortunes[winner - 1];
  return (
    <section className="flex flex-1 flex-col gap-5">
      {header}
      <div className="rounded-3xl p-6 text-center text-white" style={{ background: colorOf(w.slot).hex }}>
        <p className="text-sm font-semibold opacity-90">오늘의 커피 요정</p>
        <div className="mt-1 text-7xl font-black">{w.slot}</div>
        <p className="text-sm opacity-80">{colorOf(w.slot).name}</p>
        {w.label && <h1 className="mt-2 text-3xl font-black">{w.label}</h1>}
        <p className="mt-2 text-4xl font-black">
          {w.score}
          {tied && <span className="text-xl">.{w.tie}</span>}
        </p>
        <p className="mt-3 text-sm leading-relaxed">{w.message}</p>
      </div>
      {!w.label && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
            if (name) update({ labels: { ...state.labels, [w.slot]: name } });
          }}
          className="flex gap-2"
        >
          <input name="name" maxLength={10} placeholder="당첨자 이름 (선택)" className="flex-1 rounded-xl border border-black/10 px-4 py-3" />
          <button className="rounded-xl bg-foreground px-4 font-bold text-white">적기</button>
        </form>
      )}
      <ul className="flex flex-col gap-2">
        {ranking.map((slot, i) => {
          const f = fortunes[slot - 1];
          return (
            <li key={slot} className="flex items-center gap-3 rounded-2xl bg-black/5 px-3 py-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full font-black text-white" style={{ background: colorOf(slot).hex }}>
                {slot}
              </span>
              <div className="flex-1">
                <div className="font-semibold">
                  {displayName(f)} <span className="text-xs opacity-60">{f.grade}</span>
                </div>
              </div>
              <span className="font-black">
                {f.score}
                {tied && i < 2 && <span className="text-xs opacity-60">.{f.tie}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs opacity-60">링크를 열면 같은 카드가 보여요. 각자 폰에서 확인해도 돼요.</p>
      <div className="mt-auto flex flex-col gap-2">
        <button onClick={copyLink} className="rounded-2xl bg-accent py-4 text-lg font-bold text-white">
          {copied ? "복사됨" : "결과 링크 복사"}
        </button>
        <Link href="/" className="rounded-2xl bg-black/5 py-3 text-center font-bold">
          다시 하기
        </Link>
      </div>
    </section>
  );
}
