import { Suspense } from "react";
import Reveal from "./Reveal";

// 결과 링크 페이지. searchParams 는 클라이언트에서 읽고 전부 재계산한다.
export default function ResultPage() {
  return (
    <Suspense fallback={<p className="pt-16 text-center opacity-50">카드를 섞는 중...</p>}>
      <Reveal />
    </Suspense>
  );
}
