import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell home-minimal-shell">
      <section className="hero-card home-minimal-card">
        <div className="brand-kicker">Elvano Hair Signature</div>
        <Link className="button home-minimal-button" href="/admin/login">
          로그인 하기
        </Link>
      </section>
    </main>
  );
}
