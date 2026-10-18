// 참가자 색 8종. 멀리서도 구분되고 이름 부르기 쉬운 색. 색이 곧 캐릭터 자리.
export const COLORS = [
  { name: "빨강", hex: "#ff4d4d" },
  { name: "파랑", hex: "#3b7bff" },
  { name: "노랑", hex: "#ffd23f" },
  { name: "초록", hex: "#2ecc71" },
  { name: "보라", hex: "#9b59f5" },
  { name: "주황", hex: "#ff8c1a" },
  { name: "분홍", hex: "#ff6fb5" },
  { name: "하늘", hex: "#4fd1e8" },
] as const;

export const colorOf = (slot: number) => COLORS[(slot - 1) % COLORS.length];
