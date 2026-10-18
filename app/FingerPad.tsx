"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { colorOf } from "@/lib/colors";
import { FORTUNE_VERSION, newSeed, todayKST } from "@/lib/fortune";
import { encodeGame } from "@/lib/game-url";

type Finger = { id: number; x: number; y: number; slot: number };

const HOLD_MS = 2000; // 손가락 수가 이만큼 안 변하면 카운트다운 시작
const COUNT_FROM = 3;
const TOUCH_LIMIT_HINT = 5; // 아이폰 동시 터치 한계

// 시작 화면 = 손가락 올리기 패드. 카운트다운이 끝나면 시드를 만들고 /r 로 간다.
export default function FingerPad() {
  const router = useRouter();
  const [fingers, setFingers] = useState<Finger[]>([]);
  const [count, setCount] = useState<number | null>(null); // 카운트다운 숫자
  const [events, setEvents] = useState(true);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimers() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    holdTimer.current = null;
    tickTimer.current = null;
  }

  function go(mode: "f" | "d", n: number) {
    const q = encodeGame({
      version: FORTUNE_VERSION,
      mode,
      seed: newSeed(),
      count: n,
      date: todayKST(),
      events,
      finished: false,
      labels: {},
    });
    router.push(`/r?${q}`);
  }

  // 손가락 수가 바뀔 때마다 카운트다운을 처음부터
  useEffect(() => {
    clearTimers();
    const n = fingers.length;
    if (n < 2) {
      if (count !== null) setTimeout(() => setCount(null), 0);
      return;
    }
    holdTimer.current = setTimeout(() => {
      let c = COUNT_FROM;
      setCount(c);
      tickTimer.current = setInterval(() => {
        c -= 1;
        if (c <= 0) {
          clearTimers();
          go("f", n);
        } else setCount(c);
      }, 1000);
    }, HOLD_MS);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingers.length]);

  function down(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const used = new Set(fingers.map((f) => f.slot));
    let slot = 1;
    while (used.has(slot)) slot++;
    if (slot > 10) return;
    setFingers([...fingers, { id: e.pointerId, x: e.clientX, y: e.clientY, slot }]);
  }
  function move(e: React.PointerEvent) {
    setFingers((fs) => fs.map((f) => (f.id === e.pointerId ? { ...f, x: e.clientX, y: e.clientY } : f)));
  }
  function up(e: React.PointerEvent) {
    setFingers((fs) => fs.filter((f) => f.id !== e.pointerId));
  }

  return (
    <div
      className="fixed inset-0 select-none overflow-hidden bg-background"
      style={{ touchAction: "none" }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {/* 안내 */}
      <div className="pointer-events-none absolute inset-x-0 top-16 text-center">
        <p className="text-sm font-semibold text-accent">오늘 커피 누가 쏠까</p>
        <h1 className="mt-2 text-3xl font-black">
          {count !== null ? "" : fingers.length === 0 ? "다 같이 손가락 올려" : fingers.length < 2 ? "한 명 더" : "그대로 2초만"}
        </h1>
        {fingers.length >= TOUCH_LIMIT_HINT && count === null && (
          <p className="mt-2 text-xs opacity-60">6명 이상은 아래 뽑기 모드로</p>
        )}
      </div>

      {/* 카운트다운 */}
      {count !== null && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-[160px] font-black leading-none text-accent">{count}</span>
        </div>
      )}

      {/* 손가락 원 */}
      {fingers.map((f) => (
        <div
          key={f.id}
          className="pointer-events-none absolute flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-3xl font-black text-white shadow-lg"
          style={{ left: f.x, top: f.y, background: colorOf(f.slot).hex }}
        >
          {f.slot}
        </div>
      ))}

      {/* 하단 보조 */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-8" onPointerDown={(e) => e.stopPropagation()}>
        <label className="flex items-center gap-2 text-xs opacity-60">
          <input type="checkbox" checked={events} onChange={(e) => setEvents(e.target.checked)} />
          요일 이벤트 적용
        </label>
        <button onClick={() => go("d", 0)} className="rounded-full bg-black/5 px-5 py-3 text-sm font-bold">
          한 명씩 뽑기
        </button>
      </div>
    </div>
  );
}
