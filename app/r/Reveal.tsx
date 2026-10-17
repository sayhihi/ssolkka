"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { characterOf } from "@/lib/characters";
import { playGame, type Fortune } from "@/lib/fortune";
import { decodeGame, encodeGame } from "@/lib/game-url";

// 공개 연출 -> (동점이면 가위바위보) -> 결과. 애니메이션은 디자인 확정 후 Motion으로.
export default function Reveal() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const input = useMemo(() => decodeGame(params), [params]);
  const result = useMemo(() => (input ? playGame(input) : null), [input]);
  const [revealed, setRevealed] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!input || !result) {
    return (
      <section className="pt-16 text-center">
        <p className="font-semibold">링크가 이상해요.</p>
        <Link href="/play" className="mt-6 inline-block rounded-2xl bg-accent px-6 py-3 font-bold text-white">
          새로 시작하기
        </Link>
      </section>
    );
  }

  const { fortunes, revealOrder, candidates, winner, dayEvent } = result;
  const done = revealed >= revealOrder.length;

  function pickTieWinner(i: number) {
    router.replace(`${pathname}?${encodeGame({ ...input!, tieWinner: i })}`);
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  // 1) 공개 연출
  if (!done) {
    const current = revealOrder[revealed];
    return (
      <section className="flex flex-1 flex-col">
        <p className="text-sm font-semibold text-accent">{input.date}</p>
        {dayEvent && <p className="mt-1 text-xs opacity-60">{dayEvent}</p>}
        <h1 className="mt-2 text-2xl font-black">운 낮은 사람부터 공개</h1>
        <ul className="mt-6 grid grid-cols-2 gap-3">
          {revealOrder.map((idx, k) => {
            const f = fortunes[idx];
            const open = k < revealed;
            return (
              <li key={idx} className={`rounded-2xl p-4 ${open ? "bg-white" : "bg-foreground text-white"}`}>
                <div className="text-3xl">{characterOf(f.character)}</div>
                <div className="mt-1 font-bold">{f.name}</div>
                {open ? (
                  <div className="mt-1 text-sm">
                    <span className="font-black">{f.score}</span> <span className="opacity-60">{f.grade}</span>
                  </div>
                ) : (
                  <div className="mt-1 text-sm opacity-50">?</div>
                )}
              </li>
            );
          })}
        </ul>
        <button
          onClick={() => setRevealed(revealed + 1)}
          className="mt-auto rounded-2xl bg-accent py-4 text-lg font-bold text-white"
        >
          {revealed === revealOrder.length - 1 ? "마지막 카드 뒤집기" : `${fortunes[current].name} 카드 뒤집기`}
        </button>
      </section>
    );
  }

  // 2) 동점 미해결이면 가위바위보
  if (winner === null) {
    return (
      <section className="flex flex-1 flex-col">
        <h1 className="text-2xl font-black">동점! 가위바위보</h1>
        <p className="mt-2 text-sm opacity-60">실제로 하고, 이긴 사람을 눌러주세요.</p>
        <ul className="mt-6 flex flex-col gap-3">
          {candidates.map((i) => (
            <li key={i}>
              <button
                onClick={() => pickTieWinner(i)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left"
              >
                <span className="text-3xl">{characterOf(fortunes[i].character)}</span>
                <span className="font-bold">{fortunes[i].name}</span>
                <span className="ml-auto font-black">{fortunes[i].score}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  // 3) 결과
  const w: Fortune = fortunes[winner];
  return (
    <section className="flex flex-1 flex-col gap-5">
      <div className="rounded-3xl bg-gold/30 p-6 text-center">
        <p className="text-sm font-semibold">오늘의 커피 요정</p>
        <div className="mt-2 text-6xl">{characterOf(w.character)}</div>
        <h1 className="mt-2 text-3xl font-black">{w.name}</h1>
        <p className="mt-1 text-4xl font-black">{w.score}</p>
        <p className="mt-3 text-sm leading-relaxed">{w.message}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {fortunes.map((f, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2">
            <span className="text-2xl">{characterOf(f.character)}</span>
            <div className="flex-1">
              <div className="font-semibold">
                {f.name} <span className="text-xs opacity-60">{f.grade}</span>
              </div>
              <div className="text-xs opacity-60">{f.menu}</div>
            </div>
            <span className="font-black">{f.score}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-2">
        <button onClick={copyLink} className="rounded-2xl bg-accent py-4 text-lg font-bold text-white">
          {copied ? "복사됨" : "결과 링크 복사"}
        </button>
        <div className="flex gap-2">
          <button onClick={() => setRevealed(0)} className="flex-1 rounded-2xl bg-black/5 py-3 font-bold">
            다시 보기
          </button>
          <Link href="/play" className="flex-1 rounded-2xl bg-black/5 py-3 text-center font-bold">
            우리도 해보기
          </Link>
        </div>
      </div>
    </section>
  );
}
