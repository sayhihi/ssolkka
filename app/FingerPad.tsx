"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { colorOf } from "@/lib/colors";
import { FORTUNE_VERSION, dayEventOf, newSeed, todayKST } from "@/lib/fortune";
import { encodeGame } from "@/lib/game-url";

type Finger = { id: number; x: number; y: number; slot: number };

// 날짜는 클라이언트에서만 읽는다(프리렌더 시 Date.now 금지)
const noop = () => () => {};
const useToday = () => useSyncExternalStore(noop, () => todayKST(), () => null);

const HOLD_MS = 2000; // 손가락 수가 이만큼 안 변하면 카운트다운 시작
const COUNT_FROM = 3;
const TOUCH_LIMIT = 5; // 아이폰 동시 터치 한계

// 시작 화면 = 손가락 올리기 패드. 카운트다운이 끝나면 시드를 만들고 /r 로 간다.
export default function FingerPad() {
  const router = useRouter();
  const [fingers, setFingers] = useState<Finger[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [events, setEvents] = useState(true);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const today = useToday();
  const event = today ? dayEventOf(today) : null;

  function clearTimers() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    holdTimer.current = null;
    tickTimer.current = null;
  }

  function go(mode: "f" | "d", n: number) {
    const q = encodeGame({ version: FORTUNE_VERSION, mode, seed: newSeed(), count: n, date: today ?? todayKST(), events, finished: false, labels: {} });
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

  const n = fingers.length;
  const title = count !== null ? "그대로!" : n === 0 ? "다 같이\n손가락 올려" : n < 2 ? "한 명 더" : "그대로\n2초만";
  const stop = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 select-none overflow-hidden"
      style={{ touchAction: "none" }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {/* 헤더 */}
      <div className="absolute inset-x-0 top-0 mx-auto flex max-w-[430px] items-start justify-between px-5 pt-12">
        <div className="pointer-events-none flex flex-col gap-2">
          <span className="num self-start -rotate-3 rounded-md bg-ink px-2.5 py-1 text-xs tracking-[2px] text-gold">TODAY&apos;S COFFEE</span>
          <h1 className="title whitespace-pre-line text-[42px]">{title}</h1>
          <p className="text-[13px] text-[#555]">2명 이상, 2초 유지하면 시작</p>
        </div>
        <div className="flex gap-2 pt-1" onPointerDown={stop} onPointerUp={stop}>
          <button
            type="button"
            onClick={() => go("d", 0)}
            className="ink3 press h-12 w-12 rounded-xl bg-paper text-xs leading-[1.05]"
            aria-label="한 명씩 뽑기 모드"
          >
            한명
            <br />씩
          </button>
          <button
            type="button"
            onClick={() => setEvents(!events)}
            disabled={!event}
            aria-pressed={events}
            className={`ink3 press h-12 w-12 rounded-xl text-xs leading-[1.05] disabled:opacity-40 ${events ? "bg-gold text-ink" : "bg-paper text-[#888]"}`}
            aria-label={event ? `${event.label} ${events ? "켜짐" : "꺼짐"}` : "오늘은 요일 이벤트 없음"}
          >
            {event ? event.short : "이벤트"}
            <br />
            {event ? (events ? "ON" : "OFF") : "없음"}
          </button>
        </div>
      </div>

      {/* 카운트다운 링 */}
      {count !== null && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-0 rounded-full border-[16px] border-paper" style={{ boxShadow: "0 0 0 4px #111, inset 0 0 0 4px #111" }} />
          <div className="ring-spin absolute inset-0 rounded-full border-[16px] border-ink" style={{ borderBottomColor: "transparent", borderLeftColor: "transparent" }} />
          <div className="num absolute inset-0 flex items-center justify-center text-[80px] leading-none">{count}</div>
        </div>
      )}

      {/* 손가락 원 */}
      {fingers.map((f) => {
        const c = colorOf(f.slot);
        return (
          <div
            key={f.id}
            className="breathe ink4 sh6 pointer-events-none absolute flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full"
            style={{ left: f.x, top: f.y, background: c.hex, color: c.ink ? "#111" : "#fff" }}
          >
            <div className="num text-[50px] leading-none">{f.slot}</div>
            <div className="text-[13px]">{c.name}</div>
          </div>
        );
      })}

      {/* 하단 상태 바 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-[430px] px-5 pb-7">
        <div className="ink3 sh4 flex h-14 items-center justify-between rounded-[14px] bg-paper px-4">
          <span className="text-[15px]">{n === 0 ? "손가락 올리면 색이 생겨요" : `${n}명 올라옴`}</span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOUCH_LIMIT }, (_, i) => {
              const f = fingers[i];
              return f ? (
                <span key={i} className="ink2 h-3.5 w-3.5 rounded-full" style={{ background: colorOf(f.slot).hex }} />
              ) : (
                <span key={i} className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-[#999] bg-paper" />
              );
            })}
            <span className="ml-1 text-xs text-[#555]">{n >= TOUCH_LIMIT ? "6명+는 한명씩" : "최대 5"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
