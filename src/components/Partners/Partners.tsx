type Partner = {
  name: string;
  logo?: string; // e.g. "/assets/partners/ngo-one.svg" (leave out for a placeholder)
  alt?: string;
  url?: string;
};

// To add a partner, add one line here. No other code changes needed.
const PARTNERS: Partner[] = [
  { name: "NGO Partner One" },
  { name: "NGO Partner Two" },
  { name: "NGO Partner Three" },
  { name: "NGO Partner Four" },
  { name: "Sponsor One" },
  { name: "Sponsor Two" },
  { name: "Sponsor Three" },
  { name: "Sponsor Four" },
];

type PartnersProps = {
  onOpenApplyModal?: () => void;
};

export default function Partners({ onOpenApplyModal }: PartnersProps) {
  const ctaClasses =
    "mt-6 inline-block bg-[#f59e0b] px-6 py-3 font-mono text-xs font-bold text-black transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f59e0b]";

  return (
    <section
      id="partners"
      aria-labelledby="partners-heading"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6"
    >
      <h2
        id="partners-heading"
        className="text-center text-3xl font-bold text-white sm:text-4xl"
      >
        Our Partners
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm text-white/60">
        NGOs and sponsors who bring the real problems and make the event possible.
      </p>

      <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {PARTNERS.map((p) => {
          const box = (
             <div className="group relative flex h-32 items-center justify-center overflow-hidden border border-white/10 bg-white/[0.03] p-5 opacity-70 grayscale transition-all duration-500 ease-out hover:-translate-y-1 hover:border-[#f59e0b]/50 hover:bg-white/[0.06] hover:opacity-100 hover:grayscale-0 hover:shadow-[0_8px_30px_rgba(245,158,11,0.08)]">   
             <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08),transparent_65%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />          
              {p.logo ? (
                <img
                  src={p.logo}
                  alt={p.alt ?? `${p.name} logo`}
                  loading="lazy"
                  className="max-h-14 w-auto max-w-full object-contain"
                />
              ) : (
                <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-mono text-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:border-[#f59e0b]/40 group-hover:text-[#f59e0b]">
                    +
                    </div>
                    <span className="text-sm font-semibold text-white/80">
                    {p.name}
                    </span>
                </div>
              )}
            </div>
          );

          return (
            <li key={p.name}>
              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={p.name}
                  className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f59e0b]"
                >
                  {box}
                </a>
              ) : (
                box
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-14 text-center">
        <p className="mx-auto max-w-xl text-white/80">
          Run an NGO with a problem that needs software? Bring it to Hack for Good
          and student teams will build a working solution in 24 hours.
        </p>
        {onOpenApplyModal ? (
          <button type="button" onClick={onOpenApplyModal} className={ctaClasses}>
            Register your NGO
          </button>
        ) : (
          <a href="/register" className={ctaClasses}>
            Register your NGO
          </a>
        )}
      </div>
    </section>
  );
}