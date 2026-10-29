import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Clock, ExternalLink, Mail, MapPin, Phone, Send } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import WhatsAppButton from '../../components/common/WhatsAppButton';
import { Alert } from '../../components/common/Feedback';
import { Input, Textarea } from '../../components/common/Field';
import { useSettings } from '../../context/SettingsContext';
import usePageMeta from '../../hooks/usePageMeta';
import { contactSchema } from '../../schemas/public';
import { sendContact } from '../../services/publicApi';
import { applyServerErrors } from '../../utils/formErrors';
import { generalMessage } from '../../utils/whatsapp';

const isEmbeddableMap = (url) => /^https:\/\/www\.google\.com\/maps\/embed\?/.test(url || '');

export default function Contact() {
  usePageMeta('Nala Soo Xiriir', 'La xiriir TAWAKAL Building Materials: taleefan, WhatsApp, email iyo cinwaanka bakhaarka.');
  const { settings } = useSettings();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(contactSchema), defaultValues: { name: '', phone: '', email: '', subject: '', message: '' } });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await sendContact(values);
      setSent(true);
      reset();
    } catch (err) {
      if (!applyServerErrors(err, setError)) setServerError(err);
      else setServerError({ message: err.message });
    }
  };

  const info = [
    { icon: Phone, label: 'Taleefan', value: settings.phone, href: settings.phone && `tel:${settings.phone.replace(/\s/g, '')}` },
    { icon: Mail, label: 'Email', value: settings.email, href: settings.email && `mailto:${settings.email}` },
    { icon: MapPin, label: 'Cinwaanka bakhaarka', value: settings.address },
    { icon: Clock, label: 'Saacadaha shaqada', value: settings.businessHours },
  ];

  return (
    <>
      <PageHeader eyebrow="Xiriir" title="Nala Soo Xiriir" text="Su'aal, qiimo-weydiin, ama dalab gaar ah? Farriin noo soo dir ama si toos ah noogu soo wac." />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_420px]">
        <section className="card p-6 sm:p-8" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title" className="text-xl font-bold text-navy">
            Noo soo dir farriin
          </h2>
          {sent ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center" role="status">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
              <p className="mt-3 text-lg font-bold text-emerald-900">Farriintaada waa la helay</p>
              <p className="mt-1 text-sm text-emerald-900/80">Waan kula soo xiriiri doonnaa sida ugu dhaqsaha badan.</p>
              <Button variant="outline" className="mt-4" onClick={() => setSent(false)}>
                Dir farriin kale
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
              {serverError && <Alert className="sm:col-span-2">{serverError.message}</Alert>}
              <Input label="Magacaaga" required autoComplete="name" error={errors.name?.message} {...register('name')} className="sm:col-span-2" />
              <Input label="Taleefan" type="tel" inputMode="tel" autoComplete="tel" placeholder="+252 61 XXXXXXX" error={errors.phone?.message} {...register('phone')} />
              <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
              <Input label="Mawduuca" error={errors.subject?.message} {...register('subject')} className="sm:col-span-2" />
              <Textarea label="Farriinta" required rows={6} error={errors.message?.message} {...register('message')} className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <Button type="submit" size="lg" loading={isSubmitting}>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Dir farriinta
                </Button>
              </div>
            </form>
          )}
        </section>

        <aside className="space-y-5">
          <div className="card p-6">
            <h2 className="text-lg font-bold text-navy">Xogta xiriirka</h2>
            <ul className="mt-4 space-y-4">
              {info.map(({ icon: Icon, label, value, href }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-gold">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                    {!value ? (
                      <p className="text-sm text-slate-400">Weli lama gelin</p>
                    ) : href ? (
                      <a href={href} className="break-words font-semibold text-navy hover:text-royal">{value}</a>
                    ) : (
                      <p className="font-semibold text-navy">{value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <WhatsAppButton className="mt-6 w-full" size="lg" message={generalMessage}>
              Nagala hadal WhatsApp
            </WhatsAppButton>
          </div>

          {settings.mapUrl && (
            <div className="card overflow-hidden">
              {isEmbeddableMap(settings.mapUrl) ? (
                <iframe title="Khariidadda bakhaarka" src={settings.mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-64 w-full border-0" />
              ) : (
                <a href={settings.mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 p-5 font-semibold text-royal hover:bg-royal-50">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" aria-hidden="true" /> Ka eeg khariidadda
                  </span>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
