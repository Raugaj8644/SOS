export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* ── Crimson radial glow — top center ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 500,
          background: 'radial-gradient(ellipse at 50% 20%, rgba(177,18,38,0.14) 0%, rgba(177,18,38,0.05) 45%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Warm secondary glow — bottom right ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-8%',
          right: '-5%',
          width: 400,
          height: 400,
          background: 'radial-gradient(ellipse at 70% 80%, rgba(177,18,38,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Floating decorative orb — top right ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '8%',
          right: '6%',
          width: 80,
          height: 80,
          background: 'radial-gradient(circle at 35% 35%, rgba(255,128,145,0.45), rgba(177,18,38,0.30) 60%, transparent)',
          borderRadius: '50%',
          filter: 'blur(18px)',
          animation: 'breathe 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* ── Floating decorative orb — bottom left ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '12%',
          left: '4%',
          width: 56,
          height: 56,
          background: 'radial-gradient(circle at 35% 35%, rgba(255,128,145,0.35), rgba(177,18,38,0.20) 60%, transparent)',
          borderRadius: '50%',
          filter: 'blur(14px)',
          animation: 'breathe 8s ease-in-out infinite 2s',
          pointerEvents: 'none',
        }}
      />

      {/* ── Dot pattern ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(177,18,38,0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }}
      />

      {/* ── Diagonal accent lines ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 60px,
              rgba(177,18,38,0.018) 60px,
              rgba(177,18,38,0.018) 61px
            )
          `,
          pointerEvents: 'none',
        }}
      />

      {/* ── Content ── */}
      <div
        className="relative z-10 w-full max-w-sm px-4"
        style={{ animation: 'page-enter 0.5s cubic-bezier(0.16,1,0.3,1) forwards' }}
      >
        {children}
      </div>
    </div>
  );
}
