// 게임 상태 <-> URL 쿼리. 점수와 당첨자는 넣지 않는다(링크 연 쪽에서 재계산).
import { FORTUNE_VERSION, MAX_SLOTS, type GameInput } from "./fortune";

export type Mode = "f" | "d"; // f: 손가락 모드, d: 뽑기 모드

export type GameState = GameInput & {
  mode: Mode;
  finished: boolean; // 뽑기 모드에서 "끝"을 눌렀는지
};

export function encodeGame(s: GameState): string {
  const q = new URLSearchParams();
  q.set("v", String(s.version));
  q.set("m", s.mode);
  q.set("s", s.seed);
  q.set("n", String(s.count));
  q.set("d", s.date);
  if (!s.events) q.set("e", "0");
  if (s.finished) q.set("x", "1");
  const l = Object.entries(s.labels)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
  if (l) q.set("l", l);
  return q.toString();
}

export function decodeGame(q: URLSearchParams): GameState | null {
  const seed = q.get("s") ?? "";
  const date = q.get("d") ?? "";
  if (!/^[a-z0-9]{4,16}$/.test(seed) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const mode: Mode = q.get("m") === "d" ? "d" : "f";
  const count = Math.max(0, Math.min(MAX_SLOTS, Number(q.get("n") ?? 0) || 0));
  if (mode === "f" && count < 2) return null;
  const labels: Record<number, string> = {};
  for (const pair of (q.get("l") ?? "").split(",")) {
    const [k, ...rest] = pair.split(":");
    const slot = Number(k);
    const name = rest.join(":").trim();
    if (slot >= 1 && slot <= MAX_SLOTS && name) labels[slot] = name.slice(0, 10);
  }
  return {
    version: Number(q.get("v") ?? FORTUNE_VERSION) || FORTUNE_VERSION,
    mode,
    seed,
    count,
    date,
    events: q.get("e") !== "0",
    finished: q.get("x") === "1",
    labels,
  };
}
