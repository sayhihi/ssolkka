// 참가자 색 8종 = 캐릭터 자리. 디자인 시스템(아케이드 뽑기) 확정값.
// ink: 노랑·하늘처럼 밝은 색 위 글자는 잉크색.
export const COLORS = [
  { name: "빨강", hex: "#E53935", animal: "여우", ink: false },
  { name: "파랑", hex: "#1E63E9", animal: "고양이", ink: false },
  { name: "노랑", hex: "#FFC400", animal: "사자", ink: true },
  { name: "초록", hex: "#2BB24C", animal: "곰", ink: false },
  { name: "보라", hex: "#8E4BE0", animal: "토끼", ink: false },
  { name: "주황", hex: "#FF7A1A", animal: "호랑이", ink: false },
  { name: "분홍", hex: "#FF4FA3", animal: "햄스터", ink: false },
  { name: "하늘", hex: "#3AC8F5", animal: "판다", ink: true },
] as const;

const idx = (slot: number) => (((slot - 1) % COLORS.length) + COLORS.length) % COLORS.length;
export const colorOf = (slot: number) => COLORS[idx(slot)];
export const characterSrc = (slot: number) => `/characters/${idx(slot) + 1}.png`;
export const PALETTE = COLORS.map((c) => c.hex);
