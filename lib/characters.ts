// v1 임시 캐릭터 8종. 디자인 확정 후 이미지로 교체. 픽셀 캐릭터 생성은 v2.
export const CHARACTERS = ["🐱", "🐶", "🐰", "🐻", "🐼", "🦊", "🐸", "🐧"] as const;
export const characterOf = (i: number) => CHARACTERS[((i % CHARACTERS.length) + CHARACTERS.length) % CHARACTERS.length];
