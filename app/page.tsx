import Link from "next/link";

export default function Landing() {
  return (
    <section className="flex flex-1 flex-col justify-between">
      <div className="pt-16">
        <p className="text-sm font-semibold text-accent">오늘의 커피 요정 뽑기</p>
        <h1 className="mt-2 text-4xl font-black leading-tight">
          오늘 커피
          <br />
          누가 쏠까?
        </h1>
        <p className="mt-4 text-base leading-relaxed opacity-70">
          운세로 정해요. 운이 제일 좋은 사람이
          <br />
          오늘 베푸는 사람.
        </p>
      </div>
      <Link
        href="/play"
        className="block rounded-2xl bg-accent py-4 text-center text-lg font-bold text-white active:scale-[0.98]"
      >
        시작하기
      </Link>
    </section>
  );
}
