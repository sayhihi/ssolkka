// 게임 상태 <-> URL 쿼리. 점수와 당첨자는 넣지 않는다(링크 연 쪽에서 재계산).
import { FORTUNE_VERSION, type GameInput, type Rule } from "./fortune";

const MAX_PLAYERS = 10;

export function encodeGame(input: GameInput): string {
  const q = new URLSearchParams();
  q.set("v", String(input.version));
  q.set("d", input.date);
  q.set("p", input.participants.map((p) => p.name).join(","));
  q.set("c", input.participants.map((p) => p.character).join(","));
  q.set("r", input.rule);
  q.set("e", input.events ? "1" : "0");
  if (input.tieWinner !== undefined) q.set("t", String(input.tieWinner));
  return q.toString();
}

export function decodeGame(q: URLSearchParams): GameInput | null {
  const names = (q.get("p") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (names.length < 2 || names.length > MAX_PLAYERS) return null;
  const chars = (q.get("c") ?? "").split(",").map((s) => Number(s));
  const date = q.get("d") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const rule: Rule = q.get("r") === "low" ? "low" : "high";
  const t = q.get("t");
  return {
    version: Number(q.get("v") ?? FORTUNE_VERSION) || FORTUNE_VERSION,
    date,
    participants: names.map((name, i) => ({ name, character: Number.isFinite(chars[i]) ? chars[i] : i })),
    rule,
    events: q.get("e") !== "0",
    tieWinner: t !== null && t !== "" ? Number(t) : undefined,
  };
}
