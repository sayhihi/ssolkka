// 운세 계산 모듈. 저장소 없이 "날짜 + 이름"만으로 같은 결과를 재현한다.
// 계산식이나 규칙을 바꿀 땐 새 버전을 추가하고 옛 버전은 그대로 둔다.
// (과거 결과 링크가 다시 계산될 때 바뀌면 안 되기 때문)

export const FORTUNE_VERSION = 1;

export type Grade = "대길" | "길" | "평" | "흉";
export type Rule = "high" | "low"; // high: 점수 높은 사람이 쏜다(기본), low: 낮은 사람이 쏜다

export type Participant = { name: string; character: number };

export type Fortune = {
  name: string;
  character: number;
  score: number;
  grade: Grade;
  message: string;
  menu: string;
};

export type GameInput = {
  version: number;
  date: string; // YYYY-MM-DD (KST 기준)
  participants: Participant[];
  rule: Rule;
  events: boolean;
  tieWinner?: number; // 동점일 때 가위바위보로 정한 참가자 index
};

export type GameResult = {
  fortunes: Fortune[]; // 입력 순서 그대로
  revealOrder: number[]; // 공개 순서(당첨 후보가 마지막)
  candidates: number[]; // 당첨 후보(동점이면 2명 이상)
  winner: number | null; // 동점 미해결이면 null
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
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function gradeOf(score: number): Grade {
  if (score >= 85) return "대길";
  if (score >= 60) return "길";
  if (score >= 30) return "평";
  return "흉";
}

// 등급별 메시지 풀. 대길은 전부 "베푸는 날" 톤. 등급당 30개 이상이 목표(지금은 씨앗).
const MESSAGES: Record<Grade, string[]> = {
  대길: [
    "{name}, 오늘 귀인이 당신 손에서 커피를 받습니다.",
    "운이 넘쳐서 흘러요. {day}의 커피는 당신이 베푸는 날.",
    "오늘 쓴 돈은 세 배로 돌아옵니다. 일단 커피부터.",
    "{name} 덕분에 팀 전체의 오후 운이 올라갑니다.",
    "오늘은 받는 날이 아니라 주는 날. 그래서 더 좋은 날.",
  ],
  길: [
    "작은 행운이 하나 있어요. 커피는 남이 사줄 확률 높음.",
    "{day} 오후, 일이 생각보다 잘 풀립니다.",
    "오늘 들은 칭찬은 진심이에요. {name}, 믿어도 됩니다.",
    "엘리베이터가 바로 옵니다. 그 정도의 운.",
    "오늘은 메신저 답장이 빨리 오는 날.",
  ],
  평: [
    "무난한 하루. 커피는 얻어 마시고 조용히 지나가세요.",
    "{name}, 오늘은 평균. 평균도 나쁘지 않아요.",
    "특별한 일은 없지만 특별히 나쁜 일도 없습니다.",
    "{day}의 운세: 점심 메뉴 고르는 데 10분 이상 걸림.",
    "오늘은 지켜보는 날. 내일을 위해 힘을 아끼세요.",
  ],
  흉: [
    "오늘은 아이스 아메리카노로 정신 차리는 날.",
    "{name}, 커피는 꼭 얻어 마시세요. 지갑 열지 마세요.",
    "작은 실수 주의. 메일 보내기 전에 한 번 더.",
    "오늘 운은 바닥. 대신 내일은 올라갈 일만 남았어요.",
    "{day}엔 단 걸 드세요. 운세가 그렇게 말합니다.",
  ],
};

const MENUS: Record<Grade, string[]> = {
  대길: ["제일 비싼 거 드세요. 오늘은 돼요.", "시즌 한정 메뉴 도전하는 날."],
  길: ["라떼 계열. 부드럽게 가는 날.", "바닐라 한 펌프 추가해도 되는 날."],
  평: ["늘 마시던 거. 모험은 다음에.", "아메리카노, 적당한 온도로."],
  흉: ["아이스 아메리카노. 샷 추가.", "달달한 거 하나. 오늘은 당 보충이 먼저."],
};

const DAY_NAMES = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00+09:00`).getDay();
}

// 요일 이벤트 규칙(v1). 월요일 전원 -5, 금요일 전원 +8.
function dayEventOf(date: string): { label: string; delta: number } | null {
  const d = dayOfWeek(date);
  if (d === 1) return { label: "월요병 보정: 전원 -5", delta: -5 };
  if (d === 5) return { label: "불금 보정: 전원 +8", delta: 8 };
  return null;
}

function pick<T>(arr: T[], seedStr: string): T {
  return arr[hash53(seedStr) % arr.length];
}

function fill(template: string, name: string, date: string): string {
  return template.replaceAll("{name}", name).replaceAll("{day}", DAY_NAMES[dayOfWeek(date)]);
}

export function fortuneOf(p: Participant, date: string, version: number, delta: number): Fortune {
  const key = `${version}|${date}|${p.name}`;
  const base = hash53(key) % 101;
  const score = Math.max(0, Math.min(100, base + delta));
  const grade = gradeOf(score);
  return {
    name: p.name,
    character: p.character,
    score,
    grade,
    message: fill(pick(MESSAGES[grade], key + "|msg"), p.name, date),
    menu: pick(MENUS[grade], key + "|menu"),
  };
}

export function playGame(input: GameInput): GameResult {
  const event = input.events ? dayEventOf(input.date) : null;
  const delta = event?.delta ?? 0;
  const fortunes = input.participants.map((p) => fortuneOf(p, input.date, input.version, delta));

  const dir = input.rule === "high" ? -1 : 1;
  const sorted = fortunes
    .map((f, i) => i)
    .sort((a, b) => (fortunes[a].score - fortunes[b].score) * dir || a - b);
  // sorted[0] = 당첨 후보 1순위. 공개는 반대 순서(후보가 마지막).
  const topScore = fortunes[sorted[0]].score;
  const candidates = sorted.filter((i) => fortunes[i].score === topScore);

  let winner: number | null = null;
  if (candidates.length === 1) winner = candidates[0];
  else if (input.tieWinner !== undefined && candidates.includes(input.tieWinner)) winner = input.tieWinner;

  const revealOrder = [...sorted].reverse();
  return { fortunes, revealOrder, candidates, winner, dayEvent: event?.label ?? null };
}
