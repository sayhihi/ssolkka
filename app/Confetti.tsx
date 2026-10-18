"use client";

import { useEffect, useRef } from "react";
import { PALETTE } from "@/lib/colors";

// 결과가 뜨는 순간 한 번 터지는 컨페티.
// canvas-confetti 기본 인스턴스(body에 캔버스 추가 + 웹워커)는 아이폰 사파리에서 페이지 전환 직후 그려지지 않는 경우가 있어
// 우리 트리 안의 캔버스에 워커 없이 직접 그린다. 마운트될 때 터지므로 "끝" 탭, 새로고침, 링크 열기 모두 같은 경로.
export default function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const fire = confetti.create(canvas, { resize: true, useWorker: false });
      const colors = [...PALETTE, "#FFC400"];
      fire({ particleCount: 140, spread: 75, origin: { y: 0.35 }, colors, scalar: 1.1 });
      timers.push(setTimeout(() => fire({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors }), 250));
      timers.push(setTimeout(() => fire({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors }), 400));
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 h-full w-full" />;
}
