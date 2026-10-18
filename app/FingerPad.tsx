"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Confetti from "@/app/Confetti";
import { characterSrc, colorOf, COLORS } from "@/lib/colors";
import { FORTUNE_VERSION, dayEventOf, newSeed, playGame, todayKST, type GameResult } from "@/lib/fortune";
import { encodeGame, type GameState } from "@/lib/game-url";

type Finger = { id: number; x: number; y: number; slot: number };
type Phase = "idle" | "reveal";

const HOLD_MS = 2000; // 손가락 수가 이만큼 안 변하면 카운트다운 시작
const COUNT_FROM = 3;
// 날짜는 클라이언트에서만 읽는다(프리렌더 시 Date.now 금지)
const noop = () => () => {};
const useToday = () => useSyncExternalStore(noop, () => todayKST(), () => null);

const MAX_FINGERS = 5; // 손가락 모드 최대 인원 = 아이폰 사파리 동시 터치 한계
const TOAST_MS = 2600;
const SLOT_MS = 110; // 캐릭터 슬롯머신 속도
const REVEAL_GAP_MS = 450; // 점수 낮은 순으로 하나씩


// 시작 화면 = 손가락 올리기 패드. 카운트다운이 끝나면 그 자리에서 바로 당첨자까지 공개한다.
export default function FingerPad() {
  const router = useRouter();
  const [fingers, setFingers] = useState<Finger[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [events, setEvents] = useState(true);
  const [tick, setTick] = useState(0); // 슬롯머신 프레임
  const [phase, setPhase] = useState<Phase>("idle");
  const [frozen, setFrozen] = useState<Finger[]>([]); // 카운트 끝난 순간의 손가락 자리
  const [game, setGame] = useState<{ state: GameState; result: GameResult } | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]); // 공개된 slot, 낮은 순
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const posRef = useRef(new Map<number, { x: number; y: number }>());
  const today = useToday();
  const event = today ? dayEventOf(today) : null;
  const limit = MAX_FINGERS;
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  function clearTimers() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    holdTimer.current = null;
    tickTimer.current = null;
  }

  function makeState(mode: "f" | "d", picks: number[]): GameState {
    return { version: FORTUNE_VERSION, mode, seed: newSeed(), picks, date: today ?? todayKST(), events, finished: false, labels: {} };
  }

  // 카운트 끝: 자리 고정 + 결과 계산 + 그 자리에서 공개 시작
  function startReveal(current: Finger[]) {
    const snap = current.map((f) => ({ ...f, ...(posRef.current.get(f.id) ?? { x: f.x, y: f.y }) }));
    const state = makeState("f", snap.map((_, i) => i + 1));
    const result = playGame(state);
    setFrozen(snap);
    setGame({ state, result });
    setPhase("reveal");
    setCount(null);
  }

  // 손가락 수가 바뀔 때마다 카운트다운을 처음부터
  useEffect(() => {
    if (phase !== "idle") return;
    clearTimers();
    const n = fingers.length;
    if (n < 2) {
      if (count !== null) setTimeout(() => setCount(null), 0);
      return;
    }
    const current = fingers;
    holdTimer.current = setTimeout(() => {
      let c = COUNT_FROM;
      setCount(c);
      tickTimer.current = setInterval(() => {
        c -= 1;
        if (c <= 0) {
          clearTimers();
          startReveal(current);
        } else setCount(c);
      }, 1000);
    }, HOLD_MS);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingers.length, phase]);

  // 손가락이 올라와 있는 동안 캐릭터 슬롯머신
  useEffect(() => {
    if (phase !== "idle" || fingers.length === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), SLOT_MS);
    return () => clearInterval(id);
  }, [phase, fingers.length]);

  // 공개: 점수 낮은 순으로 하나씩, 마지막이 당첨자
  useEffect(() => {
    if (phase !== "reveal" || !game) return;
    const order = [...game.result.ranking].reverse();
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setRevealed(order.slice(0, i));
      if (i >= order.length) clearInterval(id);
    }, REVEAL_GAP_MS);
    return () => clearInterval(id);
  }, [phase, game]);

  function down(e: React.PointerEvent) {
    if (phase !== "idle") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (fingers.length >= MAX_FINGERS) {
      showToast(`손가락은 ${MAX_FINGERS}개까지. 더 많으면 카드뽑기로!`);
      return;
    }
    const used = new Set(fingers.map((f) => f.slot));
    let slot = 1;
    while (used.has(slot)) slot++;
    posRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setFingers([...fingers, { id: e.pointerId, x: e.clientX, y: e.clientY, slot }]);
  }
  function move(e: React.PointerEvent) {
    if (phase !== "idle") return;
    posRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setFingers((fs) => fs.map((f) => (f.id === e.pointerId ? { ...f, x: e.clientX, y: e.clientY } : f)));
  }
  function up(e: React.PointerEvent) {
    if (phase !== "idle") return;
    posRef.current.delete(e.pointerId);
    setFingers((fs) => fs.filter((f) => f.id !== e.pointerId));
  }
  function cancel(e: React.PointerEvent) {
    if (phase !== "idle") return;
    // 아이폰은 6번째 손가락이 닿으면 터치를 전부 취소한다. 그 순간을 잡아 안내.
    if (fingers.length >= MAX_FINGERS) showToast(`손가락이 ${MAX_FINGERS + 1}개 이상 닿아서 취소됐어요. ${MAX_FINGERS}명까지만!`);
    up(e);
  }
  function reset() {
    setPhase("idle");
    setFingers([]);
    setFrozen([]);
    setGame(null);
    setRevealed([]);
    posRef.current.clear();
  }

  const n = fingers.length;
  const done = !!game && revealed.length >= game.result.fortunes.length;
  const winner = game?.result.winner ?? null;
  const title =
    phase === "reveal" ? (done ? "오늘 베푸는 사람" : "두구두구") : count !== null ? "그대로!" : n === 0 ? "다 같이\n손가락 올려" : n < 2 ? "한 명 더" : "그대로\n2초만";
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  const circles = phase === "reveal" ? frozen : fingers;

  return (
    <div
      className="fixed inset-0 select-none overflow-hidden"
      style={{ touchAction: "none" }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
    >
      {/* 헤더 */}
      <div className="absolute inset-x-0 top-0 mx-auto flex max-w-[430px] items-start justify-between px-5 pt-12">
        <div className="pointer-events-none flex flex-col gap-2">
          <span className="num self-start -rotate-3 rounded-md bg-ink px-2.5 py-1 text-xs tracking-[2px] text-gold">{done ? "WINNER" : "TODAY'S COFFEE"}</span>
          <h1 className="title whitespace-pre-line text-[42px]">{title}</h1>
          {phase === "idle" && (
            <p className="text-[13px] text-[#555]">
              {n >= limit ? `${limit}명 꽉 참. 더 올리면 취소돼요` : "2명 이상, 2초 유지하면 시작"}
            </p>
          )}
        </div>
        {phase === "idle" && (
          <div className="flex gap-2 pt-1" onPointerDown={stop} onPointerUp={stop}>
            <button type="button" onClick={() => router.push(`/r?${encodeGame(makeState("d", []))}`)} className="ink3 press h-12 w-12 rounded-xl bg-paper text-xs leading-[1.05]" aria-label="카드 뽑기 모드">
              카드
              <br />뽑기
            </button>
            {event && (
              <button
                type="button"
                onClick={() => setEvents(!events)}
                aria-pressed={events}
                className={`ink3 press h-12 w-12 rounded-xl text-xs leading-[1.05] ${events ? "bg-gold text-ink" : "bg-paper text-[#888]"}`}
                aria-label={`${event.label} ${events ? "켜짐" : "꺼짐"}`}
              >
                {event.short}
                <br />
                {events ? "ON" : "OFF"}
              </button>
            )}
          </div>
        )}
      </div>

      {done && <Confetti />}

      {/* 알림 토스트 */}
      {toast && (
        <div className="pop pointer-events-none absolute inset-x-5 top-[200px] z-10 mx-auto max-w-[390px]">
          <div className="ink3 sh4 rounded-xl bg-ink px-4 py-3 text-center text-sm text-gold">{toast}</div>
        </div>
      )}

      {/* 카운트다운 링 */}
      {count !== null && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-0 rounded-full border-[16px] border-paper" style={{ boxShadow: "0 0 0 4px #111, inset 0 0 0 4px #111" }} />
          <div className="ring-spin absolute inset-0 rounded-full border-[16px] border-ink" style={{ borderBottomColor: "transparent", borderLeftColor: "transparent" }} />
          <div className="num absolute inset-0 flex items-center justify-center text-[80px] leading-none">{count}</div>
        </div>
      )}

      {/* 손가락 원 */}
      {circles.map((f) => {
        const c = colorOf(f.slot);
        const fortune = game?.result.fortunes[f.slot - 1];
        const isRevealed = revealed.includes(f.slot);
        const isWinner = done && winner === f.slot;
        // 슬롯머신: 손가락마다 다른 위상으로 8종 순환. 공개되면 자기 색 동물로.
        const charSlot = phase === "reveal" ? f.slot : ((tick + f.slot * 3) % COLORS.length) + 1;
        return (
          <div
            key={f.id}
            className={`pointer-events-none absolute ${phase === "idle" ? "breathe" : ""}`}
            style={{ left: f.x, top: f.y, transform: phase === "idle" ? undefined : `translate(-50%, -50%) scale(${isWinner ? 1.25 : 1})`, transition: "transform 0.4s cubic-bezier(0.2,0.9,0.3,1.3)", zIndex: isWinner ? 2 : 1 }}
          >
            {isWinner && <span className="ink3 sh3 absolute -top-5 left-1/2 -translate-x-1/2 rotate-[-6deg] rounded-[10px] bg-paper px-3 py-0.5 text-base">대길</span>}
            <div
              className={`ink4 relative flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full ${isWinner ? "sh6g" : "sh6"}`}
              style={{ background: isWinner ? "#FFC400" : c.hex, color: c.ink || isWinner ? "#111" : "#fff" }}
            >
              <Image src={characterSrc(charSlot)} alt={colorOf(charSlot).animal} width={64} height={78} className="ink3 rounded-lg bg-paper object-cover" style={{ width: 64, height: 78 }} />
              <span className="num ink2 absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-base text-gold">{f.slot}</span>
            </div>
            {isRevealed && fortune && (
              <div className="pop absolute left-1/2 top-[124px] flex -translate-x-1/2 flex-col items-center gap-1">
                <span className={`num ink3 rounded-[10px] px-3 py-0.5 text-[26px] leading-tight ${isWinner ? "sh3 bg-gold" : "sh3 bg-paper"}`}>{fortune.score}</span>
                {!isWinner && <span className={`sticker sticker-sm ${fortune.score >= 50 ? "sticker-mid" : "sticker-low"}`}>{fortune.score >= 50 ? "길" : "평"}</span>}
              </div>
            )}
          </div>
        );
      })}

      {/* 하단: 대기 중 상태 바 / 공개 후 버튼 */}
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] px-5 pb-7" onPointerDown={stop} onPointerUp={stop}>
        {phase === "idle" ? (
          <div className="ink3 sh4 pointer-events-none flex h-14 items-center justify-between rounded-[14px] bg-paper px-4">
            <span className="text-[15px]">{n === 0 ? "손가락 올리면 색이 생겨요" : `${n}명 올라옴`}</span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: limit }, (_, i) => {
                const f = fingers[i];
                return f ? <span key={i} className="ink2 h-3.5 w-3.5 rounded-full" style={{ background: colorOf(f.slot).hex }} /> : <span key={i} className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-[#999] bg-paper" />;
              })}
              <span className="ml-1 text-xs text-[#555]">{n >= limit ? `${limit + 1}명+는 카드뽑기` : `최대 ${limit}`}</span>
            </div>
          </div>
        ) : (
          done &&
          game && (
            <div className="flex flex-col gap-2.5">
              <p className="ink3 rounded-xl bg-paper px-3 py-2 text-center text-sm leading-snug">{game.result.fortunes[winner! - 1].message}</p>
              <div className="flex gap-2.5">
                <button type="button" onClick={reset} className="btn-small press w-24">다시</button>
                <button type="button" onClick={() => router.push(`/r?${encodeGame(game.state)}`)} className="btn-big flex-1 rounded-2xl">결과 자세히</button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
