import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Boxes, ClipboardList, Clock, Mail, MapPin, MessageCircle, Phone, Search, ShoppingCart, Truck } from 'lucide-react';
import Button from '../../components/common/Button';
import WhatsAppButton from '../../components/common/WhatsAppButton';
import { ErrorState, Skeleton } from '../../components/common/Feedback';
import ProductCard, { ProductCardSkeleton, ProductGrid } from '../../components/products/ProductCard';
import { CategoryArt } from '../../components/products/ProductImage';
import { useSettings } from '../../context/SettingsContext';
import useFetch from '../../hooks/useFetch';
import usePageMeta from '../../hooks/usePageMeta';
import { getCategories, getProducts } from '../../services/publicApi';
import { generalMessage } from '../../utils/whatsapp';

const WHY = [
  { icon: BadgeCheck, title: 'Tayo la hubo', text: 'Waxaan diiradda saarnaa alaab dhisme oo adag oo ku habboon mashaariicda guryaha iyo ganacsiga.' },
  { icon: Boxes, title: 'Kayd cad', text: 'Website-ku wuxuu muujiyaa kaydka hadda jira, si aad u ogaato waxa la heli karo ka hor inta aadan dalban.' },
  { icon: Truck, title: 'Gaarsiin ama qaadasho', text: 'Dooro in alaabta laguu keeno goobta dhismaha ama aad ka qaadato bakhaarka.' },
  { icon: MessageCircle, title: 'Dalab fudud', text: 'Ka dalbo website-ka ama si toos ah WhatsApp. Kooxdayadu way kula soo xiriiraysaa si ay u xaqiijiso.' },
];

const STEPS = [
  { icon: Search, title: 'Dooro alaabta', text: 'Ka raadi alaabta aad u baahan tahay qaybaha kala duwan.' },
  { icon: ShoppingCart, title: 'Ku dar dambiisha', text: 'Geli tirada aad rabto oo eeg qiyaasta wadarta.' },
  { icon: ClipboardList, title: 'Dir dalabka', text: 'Buuxi magacaaga, taleefankaaga iyo meesha la geynayo.' },
  { icon: Truck, title: 'Hel alaabtaada', text: 'Waan kula soo xiriiraynaa, kadibna alaabta waa laguu keenayaa ama waad ka qaadanaysaa bakhaarka.' },
];

function SectionTitle({ eyebrow, title, text, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold text-navy sm:text-3xl">{title}</h2>
        {text && <p className="mt-2 max-w-2xl text-slate-600">{text}</p>}
      </div>
      {action}
    </div>
  );
}

function Hero({ categories }) {
  const tiles = (categories || []).slice(0, 4);
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div
        className="absolute inset-0 opacity-[0.07]"
        aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-royal opacity-60 blur-3xl" aria-hidden="true" />
      <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-gold">
            Bakhaarka alaabta dhismaha
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
            Alaab Dhisme oo Tayo Leh oo Aad <span className="text-gold">Ku Kalsoonaan Karto.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/75">
            TAWAKAL waxay kuu haysaa sibidh, bir, leben, tuubooyin, alaabta korontada iyo rinji. Wax kasta oo dhismahaagu u baahan yahay, hal meel ka hel.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/alaabta" variant="gold" size="lg">
              Eeg Alaabta
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <WhatsAppButton size="lg" message={generalMessage}>
              Ka Dalbo WhatsApp
            </WhatsAppButton>
          </div>
        </div>

        <div className="relative hidden lg:block" aria-hidden="true">
          <svg viewBox="0 0 400 90" className="mx-auto mb-[-6px] w-[86%]">
            <path d="M8 84 200 10l192 74" fill="none" stroke="#D4AF37" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur">
            {(tiles.length ? tiles : [{ slug: 'sibidh' }, { slug: 'bir' }, { slug: 'tuubo' }, { slug: 'leben' }]).map((c) => (
              <div key={c.slug} className="overflow-hidden rounded-xl">
                <CategoryArt slug={c.slug} name={c.name} className="aspect-[4/3] w-full" iconClass="h-14 w-14" />
                {c.name && <p className="bg-white px-3 py-2 text-sm font-bold text-navy">{c.name}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-gradient-to-r from-gold-600 via-gold to-gold-600" />
    </section>
  );
}

export default function Home() {
  usePageMeta('Bogga Hore', 'TAWAKAL Building Materials & Supplies: sibidh, bir, leben, tuubooyin, koronto iyo rinji. Ka dalbo website-ka ama WhatsApp.');
  const { settings } = useSettings();
  const categories = useFetch(getCategories, []);
  const featured = useFetch(() => getProducts({ featured: 'true', limit: 8 }), []);
  // Tirada guud ee alaabta (waxay ka timaaddaa database-ka)
  const all = useFetch(() => getProducts({ limit: 1 }), []);

  const featuredItems = featured.data?.data || [];
  const stats = [
    { label: 'Qaybaha alaabta', value: categories.data?.length },
    { label: 'Alaabta la heli karo', value: all.data?.pagination?.total },
  ].filter((s) => Number.isFinite(s.value) && s.value > 0);

  const contact = [
    settings.phone && { icon: Phone, label: 'Taleefan', value: settings.phone, href: `tel:${settings.phone.replace(/\s/g, '')}` },
    settings.email && { icon: Mail, label: 'Email', value: settings.email, href: `mailto:${settings.email}` },
    settings.address && { icon: MapPin, label: 'Bakhaarka', value: settings.address, href: settings.mapUrl || undefined },
    settings.businessHours && { icon: Clock, label: 'Saacadaha shaqada', value: settings.businessHours },
  ].filter(Boolean);

  return (
    <>
      <Hero categories={categories.data} />

      {/* Qaybaha */}
      <section className="container-page py-16">
        <SectionTitle
          eyebrow="Qaybaha"
          title="Maxaad dhisaysaa maanta?"
          text="Dooro qaybta aad u baahan tahay si aad u aragto alaabta iyo qiimaha."
          action={
            <Link to="/alaabta" className="inline-flex items-center gap-1.5 text-sm font-bold text-royal hover:underline">
              Dhammaan alaabta <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
        {categories.error ? (
          <div className="card">
            <ErrorState error={categories.error} onRetry={categories.reload} />
          </div>
        ) : categories.loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : categories.data.length === 0 ? (
          <p className="card px-6 py-10 text-center text-sm text-slate-600">Qaybo weli lama gelin.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {categories.data.map((c) => (
              <li key={c.id}>
                <Link to={`/alaabta?qayb=${c.slug}`} className="card group block overflow-hidden transition-shadow hover:shadow-lift">
                  <CategoryArt slug={c.slug} name={c.name} className="aspect-[4/3] w-full" iconClass="h-10 w-10 transition-transform duration-300 group-hover:scale-110" />
                  <div className="px-3 py-3">
                    <p className="text-sm font-bold text-navy group-hover:text-royal">{c.name}</p>
                    <p className="num text-xs text-slate-500">{c.productCount} alaab</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Alaabta la xushay */}
      <section className="bg-white py-16">
        <div className="container-page">
          <SectionTitle eyebrow="La xushay" title="Alaabta ugu caansan" text="Qiimayaasha iyo kaydka waxaa si toos ah looga soo qaadaa bakhaarka." />
          {featured.error ? (
            <ErrorState error={featured.error} onRetry={featured.reload} />
          ) : featured.loading ? (
            <ProductGrid>
              {Array.from({ length: 4 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </ProductGrid>
          ) : featuredItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-600">
              Alaab la xushay weli ma jirto. <Link to="/alaabta" className="font-bold text-royal hover:underline">Eeg dhammaan alaabta</Link>.
            </p>
          ) : (
            <ProductGrid>
              {featuredItems.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </ProductGrid>
          )}
        </div>
      </section>

      {/* Maxaa TAWAKAL loo doortaa */}
      <section className="container-page py-16">
        <SectionTitle eyebrow="Maxaa nala doortaa" title="Maxaa TAWAKAL loo doortaa?" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-6">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy text-gold">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-navy">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>

        {stats.length > 0 && (
          <dl className="mt-8 grid gap-px overflow-hidden rounded-xl bg-slate-200 sm:grid-cols-2">
            {stats.map((s) => (
              <div key={s.label} className="bg-white px-6 py-6 text-center">
                <dd className="num text-4xl font-extrabold text-royal">{s.value}</dd>
                <dt className="mt-1 text-sm font-semibold text-slate-600">{s.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Sida loo dalbado */}
      <section className="bg-navy py-16 text-white">
        <div className="container-page">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Sida loo dalbado</p>
          <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Afar tallaabo oo fudud</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-xl border border-white/10 bg-white/5 p-6">
                <span className="num absolute right-5 top-4 text-4xl font-extrabold text-white/10">{i + 1}</span>
                <Icon className="h-7 w-7 text-gold" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm text-white/70">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Xiriir */}
      <section className="container-page py-16">
        <div className="card grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="eyebrow">Nala soo xiriir</p>
            <h2 className="mt-2 text-2xl font-extrabold text-navy sm:text-3xl">Ma u baahan tahay qiimo ama talo?</h2>
            {contact.length > 0 ? (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {contact.map(({ icon: Icon, label, value, href }) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-royal-50 text-royal">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                      {href ? (
                        <a href={href} className="font-semibold text-navy hover:text-royal" {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                          {value}
                        </a>
                      ) : (
                        <p className="font-semibold text-navy">{value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-slate-600">Noo soo dir farriin, waan kuu soo jawaabi doonnaa.</p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <Button to="/xiriir" size="lg">
              Noo soo dir farriin
            </Button>
            <WhatsAppButton size="lg" message={generalMessage}>
              Nagala hadal WhatsApp
            </WhatsAppButton>
          </div>
        </div>
      </section>
    </>
  );
}
