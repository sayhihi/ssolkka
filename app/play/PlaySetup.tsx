"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CHARACTERS, characterOf } from "@/lib/characters";
import { FORTUNE_VERSION, todayKST, type Participant, type Rule } from "@/lib/fortune";
import { encodeGame } from "@/lib/game-url";

const LS_KEY = "ssolkka:lastPlayers";
const MAX = 10;

// 참가자 입력 + 규칙 확인. 완료하면 /r?... 로 이동(공개 연출은 /r 에서).
export default function PlaySetup() {
  const router = useRouter();
  const [players, setPlayers] = useState<Participant[]>([]);
  const [name, setName] = useState("");
  const [rule, setRule] = useState<Rule>("high");
  const [events, setEvents] = useState(true);
  const [step, setStep] = useState<"setup" | "rules">("setup");

  // 지난 참가자 불러오기. effect 대신 버튼으로(SSR 불일치와 린트 회피).
  function loadLast() {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setPlayers(JSON.parse(saved));
    } catch {}
  }

  function add() {
    const n = name.trim();
    if (!n || players.length >= MAX) return;
    if (players.some((p) => p.name === n)) return; // 이름 중복 방지
    setPlayers([...players, { name: n, character: players.length % CHARACTERS.length }]);
    setName("");
  }
  function remove(i: number) {
    setPlayers(players.filter((_, k) => k !== i));
  }
  function cycleCharacter(i: number) {
    setPlayers(players.map((p, k) => (k === i ? { ...p, character: (p.character + 1) % CHARACTERS.length } : p)));
  }
  function start() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(players));
    } catch {}
    const q = encodeGame({ version: FORTUNE_VERSION, date: todayKST(), participants: players, rule, events });
    router.push(`/r?${q}`);
  }

  if (step === "rules") {
    return (
      <section className="flex flex-1 flex-col gap-6">
        <h1 className="text-2xl font-black">오늘의 규칙</h1>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm font-semibold opacity-60">누가 쏘나</p>
          <div className="mt-2 flex gap-2">
            {(["high", "low"] as Rule[]).map((r) => (
              <button
                key={r}
                onClick={() => setRule(r)}
                className={`flex-1 rounded-xl py-3 font-bold ${rule === r ? "bg-accent text-white" : "bg-black/5"}`}
              >
                {r === "high" ? "운 제일 좋은 사람" : "운 제일 나쁜 사람"}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between rounded-2xl bg-white p-4">
          <span className="font-semibold">요일 이벤트 적용</span>
          <input type="checkbox" checked={events} onChange={(e) => setEvents(e.target.checked)} className="h-5 w-5" />
        </label>
        <p className="text-sm opacity-60">같은 날 같은 참가자면 몇 번을 돌려도 같은 결과가 나와요.</p>
        <div className="mt-auto flex gap-2">
          <button onClick={() => setStep("setup")} className="rounded-2xl bg-black/5 px-5 py-4 font-bold">
            뒤로
          </button>
          <button onClick={start} className="flex-1 rounded-2xl bg-accent py-4 text-lg font-bold text-white">
            카드 뒤집으러 가기
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-black">누가 참가해?</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          maxLength={10}
          className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-3"
        />
        <button type="submit" className="rounded-xl bg-foreground px-4 font-bold text-white">
          추가
        </button>
      </form>
      <ul className="flex flex-col gap-2">
        {players.map((p, i) => (
          <li key={p.name} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2">
            <button onClick={() => cycleCharacter(i)} className="text-3xl" aria-label="캐릭터 바꾸기">
              {characterOf(p.character)}
            </button>
            <span className="flex-1 font-semibold">{p.name}</span>
            <button onClick={() => remove(i)} className="px-2 text-sm opacity-50">
              삭제
            </button>
          </li>
        ))}
      </ul>
      <p className="text-sm opacity-60">
        {players.length}/{MAX}명. 캐릭터를 누르면 바뀌어요.
      </p>
      {players.length === 0 && (
        <button onClick={loadLast} className="self-start text-sm font-semibold text-accent">
          지난 참가자 불러오기
        </button>
      )}
      <button
        disabled={players.length < 2}
        onClick={() => setStep("rules")}
        className="mt-auto rounded-2xl bg-accent py-4 text-lg font-bold text-white disabled:opacity-30"
      >
        다음
      </button>
    </section>
  );
}
