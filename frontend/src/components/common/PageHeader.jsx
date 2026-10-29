export default function PageHeader({ eyebrow, title, text, children }) {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div
        className="absolute inset-0 opacity-[0.07]"
        aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="container-page relative py-12 sm:py-14">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {text && <p className="mt-3 max-w-2xl text-white/75">{text}</p>}
        {children}
      </div>
      <div className="h-1 bg-gradient-to-r from-gold-600 via-gold to-transparent" />
    </section>
  );
}
