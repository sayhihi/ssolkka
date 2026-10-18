// 운세 계산 모듈. 저장소 없이 "시드 + 번호"만으로 같은 결과를 재현한다.
// 계산식이나 규칙을 바꿀 땐 새 버전을 추가하고 옛 버전은 그대로 둔다.
// (과거 결과 링크가 다시 계산될 때 바뀌면 안 되기 때문)

import { MESSAGES } from "./messages";

export const FORTUNE_VERSION = 2;
export const MAX_SLOTS = 10;

export type Grade = "대길" | "길" | "평"; // 대길은 그 판의 당첨자 한 명에게만 붙는 라벨

export type Fortune = {
  slot: number; // 표시 번호(1부터). 손가락 모드는 손가락 순서, 뽑기 모드는 뽑은 순서
  pos: number; // 점수를 정하는 자리. 손가락 모드는 slot과 같고, 뽑기 모드는 부채꼴에서 집은 자리(비공개)
  label: string | null; // 선택 이름
  score: number; // 0~100 정수(표시용)
  tie: number; // 0~9 숨은 소수점. 동점일 때만 공개
  grade: Grade;
  message: string;
};

export type GameInput = {
  version: number;
  seed: string;
  picks: number[]; // 자리 목록. 손가락 모드는 [1..n], 뽑기 모드는 집은 자리를 뽑은 순서대로
  date: string; // YYYY-MM-DD (KST). 요일 이벤트와 표시용
  events: boolean;
  labels: Record<number, string>; // slot -> 이름(선택)
};

export type GameResult = {
  fortunes: Fortune[]; // 번호순
  ranking: number[]; // 당첨 순위(슬롯 번호). [0]이 당첨자
  winner: number | null; // count < 2 면 null
  tied: boolean; // 1등 점수가 동점이라 소수점으로 갈렸는지
  dayEvent: string | null;
};

// cyrb53: 짧은 문자열용 53비트 해시. 암호용이 아니라 "재현 가능한 랜덤"용.
function hash53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function todayKST(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function newSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

const DAY_NAMES = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00+09:00`).getDay();
}

// 요일 이벤트 규칙(v2). 월요일 전원 -5, 금요일 전원 +8.
export function dayEventOf(date: string): { label: string; short: string; delta: number } | null {
  const d = dayOfWeek(date);
  if (d === 1) return { label: "월요병 보정: 전원 -5", short: "월", delta: -5 };
  if (d === 5) return { label: "불금 보정: 전원 +8", short: "금", delta: 8 };
  return null;
}

function pick<T>(arr: T[], seedStr: string): T {
  return arr[hash53(seedStr) % arr.length];
}

export function displayName(f: Pick<Fortune, "slot" | "label">): string {
  return f.label ?? `${f.slot}번`;
}

export function playGame(input: GameInput): GameResult {
  const picks = input.picks.slice(0, MAX_SLOTS);
  const count = picks.length;
  const event = input.events ? dayEventOf(input.date) : null;
  const delta = event?.delta ?? 0;
  const day = DAY_NAMES[dayOfWeek(input.date)];

  const base = picks.map((pos, i) => {
    const slot = i + 1;
    const key = `${input.version}|${input.seed}|${pos}`;
    const score = Math.max(0, Math.min(100, (hash53(key) % 101) + delta));
    const tie = hash53(key + "|tie") % 10;
    return { slot, pos, label: input.labels[slot] ?? null, score, tie, key };
  });

  const ranking = base
    .map((b) => b.slot)
    .sort((a, b) => {
      const A = base[a - 1], B = base[b - 1];
      return B.score - A.score || B.tie - A.tie || a - b;
    });
  const winner = count >= 2 ? ranking[0] : null;
  const tied = count >= 2 && base[ranking[0] - 1].score === base[ranking[1] - 1].score;

  const fortunes: Fortune[] = base.map((b) => {
    const grade: Grade = b.slot === winner ? "대길" : b.score >= 50 ? "길" : "평";
    const name = displayName(b);
    const pool = MESSAGES[grade];
    const message = `${pick(pool.front, b.key + "|front")} ${pick(pool.back, b.key + "|back")}`
      .replaceAll("{name}", name)
      .replaceAll("{day}", day);
    return { slot: b.slot, pos: b.pos, label: b.label, score: b.score, tie: b.tie, grade, message };
  });

  return { fortunes, ranking, winner, tied, dayEvent: event?.label ?? null };
}
