# 쏠까 (ssolkka)

오늘 커피 누가 쏠까. 운세로 커피 쏠 사람을 정하는 모바일 웹 게임.
운이 제일 좋은 사람이 오늘 베푸는 사람. 당첨은 벌칙이 아니라 축하.

- 공개 주소: https://ssolkka.vercel.app (main 푸시 = 자동 배포)
- 디자인 캔버스: https://claude.ai/artifact/PyNHTPsWzL4URdVjcnmJUb

## 문서

| 문서 | 내용 |
|---|---|
| [docs/spec.md](docs/spec.md) | 기능, 두 가지 모드, 점수와 등급, URL 스키마, 유저 플로우, 구현 메모 |
| [docs/design.md](docs/design.md) | 디자인 시스템 요약(색, 타이포, 선과 그림자, 컴포넌트)과 시안 단계 결과 |
| [docs/design-prompt.md](docs/design-prompt.md) | claude.ai/design에 넣었던 프롬프트 원문 |
| [docs/backlog.md](docs/backlog.md) | 후속 작업 백로그 |

## 아키텍처 한 장

- Next.js 16 App Router, Tailwind 4, pnpm. Vercel 배포. 환경변수 없음.
- 서버 저장소 없음. DB 없음, 로그인 없음. 게임 상태는 URL 쿼리에 전부 담고, 링크를 연 쪽에서 같은 계산을 다시 한다.
- 점수는 `hash(버전 | 시드 | 자리)`. 시드는 게임마다 랜덤으로 만들어 URL에 기록. 같은 링크면 어디서 열어도 같은 결과.
- 계산식이나 규칙이 바뀌면 `lib/fortune.ts`의 `FORTUNE_VERSION`을 올리고 옛 버전은 남긴다. 과거 링크가 바뀌면 안 되기 때문.
- 클라이언트 코드뿐이다. 서버 코드는 예정된 OG 이미지 라우트 하나가 전부.

```
app/
  page.tsx          /  시작 화면 (FingerPad 마운트)
  FingerPad.tsx     손가락 올리기 패드. 카운트다운 → 그 자리에서 공개 → "결과 자세히". 카드뽑기 모드 진입 버튼
  r/page.tsx        /r 결과 링크 페이지 (Suspense로 Reveal 감쌈)
  r/Reveal.tsx      카드뽑기 모드(부채꼴) + 결과 화면 + 링크 복사
  layout.tsx        폰트(Black Han Sans, Bungee), 모바일 컨테이너
  globals.css       디자인 토큰과 공용 클래스(잉크 선, 하드 그림자, 스티커, 뒤집기, 애니메이션)
lib/
  fortune.ts        점수·등급·당첨자 계산, 요일 이벤트, 버전
  messages.ts       운세 문구 풀 (앞 조각 × 뒤 조각)
  game-url.ts       게임 상태 ↔ URL 쿼리
  colors.ts         참가자 색 8종과 캐릭터
public/characters/  캐릭터 PNG 8장 (1 여우 … 8 판다)
docs/               문서
```

## 흐름

**손가락 모드.** 한 폰에 2~5명이 손가락을 올리고 2초 유지하면 카운트다운. 끝나면 원이 자리에 고정되고 점수 낮은 순으로 공개, 마지막이 당첨자. "결과 자세히"로 결과 화면.

**카드뽑기 모드.** 부채꼴로 펼쳐진 뒷면 카드 10장에서 한 명씩 직접 한 장 탭. 번호는 뽑은 순서, 운은 집은 자리. 2장 이상이면 "끝, 누가 쏘나".

## 로컬 실행

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm dev -H 0.0.0.0 # 같은 와이파이 폰에서 접속. 손가락 모드는 실기기에서만 테스트 가능
```

폰 접속은 `next.config.ts`의 `allowedDevOrigins`에 대역이 있어야 JS가 내려온다. 없으면 화면만 보이고 동작하지 않는다.

## 검증 메모

- 아이폰 사파리는 동시 터치 5개. 6번째가 닿으면 OS가 터치를 전부 취소한다. 그래서 손가락 모드 최대 5명, 초과는 화면 안 토스트로 안내.
- Next 16 린트: effect 본문에서 setState 금지, 렌더 중 ref 대입 금지, 렌더 안에서 컴포넌트 정의 금지.
- 클라이언트 컴포넌트에서 렌더 중 `Date.now()`를 읽으면 프리렌더가 막힌다. `useSyncExternalStore`로 클라이언트에서만 읽는다.
