import { Eye, HeartHandshake, ShieldCheck, Target } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { Skeleton } from '../../components/common/Feedback';
import { CategoryArt } from '../../components/products/ProductImage';
import { useSettings } from '../../context/SettingsContext';
import useFetch from '../../hooks/useFetch';
import usePageMeta from '../../hooks/usePageMeta';
import { getCategories } from '../../services/publicApi';
import { Link } from 'react-router-dom';

// Qoraalka shirkadda (hordhac, himilo, aragti) waxaa laga maamulaa Admin > Dejinta.
// Wax taariikh ah oo la been-abuuray halkan laguma qorin.
function Block({ icon: Icon, title, text, placeholder }) {
  return (
    <div className="card p-6">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy text-gold">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-navy">{title}</h2>
      {text ? <p className="mt-2 whitespace-pre-line text-slate-700">{text}</p> : <p className="mt-2 text-sm italic text-slate-400">{placeholder}</p>}
    </div>
  );
}

export default function About() {
  usePageMeta('Nagu Saabsan', 'Wax ka ogow TAWAKAL Building Materials & Supplies.');
  const { settings } = useSettings();
  const categories = useFetch(getCategories, []);
  const pending = 'Qoraalkan weli lama gelin. Maamuluhu wuxuu ka buuxin karaa Dejinta.';

  return (
    <>
      <PageHeader eyebrow="Nagu saabsan" title={`${settings.companyName} ${settings.tagline}`.trim()} />
      <div className="container-page space-y-12 py-10">
        <section className="card p-6 sm:p-10">
          <p className="eyebrow">Hordhac</p>
          {settings.aboutIntro ? (
            <p className="mt-3 max-w-3xl whitespace-pre-line text-lg leading-relaxed text-slate-700">{settings.aboutIntro}</p>
          ) : (
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-700">
              {settings.companyName} waa bakhaar iibiya alaabta dhismaha: sibidh, bir, leben iyo bulukeeti, tuubooyin, alaabta korontada, rinji iyo saqafyo.
            </p>
          )}
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <Block icon={Target} title="Himiladayada" text={settings.mission} placeholder={pending} />
          <Block icon={Eye} title="Aragtidayada" text={settings.vision} placeholder={pending} />
        </section>

        <section>
          <p className="eyebrow">Ballanqaadkayaga</p>
          <h2 className="mt-2 text-2xl font-extrabold text-navy">Tayo iyo adeeg macaamiil</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="card flex gap-4 p-6">
              <ShieldCheck className="h-8 w-8 shrink-0 text-royal" aria-hidden="true" />
              <div>
                <h3 className="font-bold text-navy">Tayo</h3>
                <p className="mt-1 text-sm text-slate-600">Waxaan ku dadaalnaa in alaab kasta oo aan iibinno ay ku habboon tahay shaqada dhismaha, qiimaha iyo kaydkana si cad ayaan u muujinnaa.</p>
              </div>
            </div>
            <div className="card flex gap-4 p-6">
              <HeartHandshake className="h-8 w-8 shrink-0 text-royal" aria-hidden="true" />
              <div>
                <h3 className="font-bold text-navy">Adeeg macaamiil</h3>
                <p className="mt-1 text-sm text-slate-600">Dalab kasta waan xaqiijinnaa ka hor inta aan la diyaarin, waxaadna raadraaci kartaa xaaladdiisa mar kasta.</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <p className="eyebrow">Waxaan iibinno</p>
          <h2 className="mt-2 text-2xl font-extrabold text-navy">Qaybaha alaabta</h2>
          {categories.loading ? (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(categories.data || []).map((c) => (
                <li key={c.id}>
                  <Link to={`/alaabta?qayb=${c.slug}`} className="card flex items-center gap-4 overflow-hidden pr-4 transition-shadow hover:shadow-lift">
                    <CategoryArt slug={c.slug} name={c.name} className="h-20 w-20 shrink-0" iconClass="h-8 w-8" />
                    <span>
                      <span className="block font-bold text-navy">{c.name}</span>
                      {c.description && <span className="block text-sm text-slate-600">{c.description}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Button to="/alaabta" className="mt-6">
            Eeg dhammaan alaabta
          </Button>
        </section>
      </div>
    </>
  );
}
