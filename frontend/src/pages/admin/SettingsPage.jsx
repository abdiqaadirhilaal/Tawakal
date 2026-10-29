import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Save, Trash2 } from 'lucide-react';
import { AdminPage, DataState } from '../../components/admin/AdminUI';
import ImageUploader from '../../components/admin/ImageUploader';
import Button from '../../components/common/Button';
import { Alert } from '../../components/common/Feedback';
import { Checkbox, Input, Select, Textarea } from '../../components/common/Field';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import { settingsSchema } from '../../schemas/admin';
import { getSettings, updateSettings } from '../../services/adminApi';
import { applyServerErrors } from '../../utils/formErrors';
import { PAYMENT_TYPE_LABELS } from '../../utils/format';

const FIELDS = Object.keys(settingsSchema.shape);

function toForm(s) {
  const out = {};
  FIELDS.forEach((f) => {
    out[f] = s[f];
  });
  out.socialLinks = { facebook: '', instagram: '', tiktok: '', ...(s.socialLinks || {}) };
  out.paymentMethods = (s.paymentMethods || []).map((m) => ({ code: m.code, label: m.label, enabled: m.enabled }));
  const pos = s.pos || {};
  out.pos = {
    requireOpenShift: pos.requireOpenShift ?? true,
    discountsEnabled: pos.discountsEnabled ?? true,
    cashierMaxDiscountPercent: pos.cashierMaxDiscountPercent ?? 5,
    maxDiscountPercent: pos.maxDiscountPercent ?? 20,
    receiptFooter: pos.receiptFooter ?? '',
    paymentMethods: (pos.paymentMethods || []).map((m) => ({ code: m.code, label: m.label, type: m.type, enabled: m.enabled })),
  };
  return out;
}

function Card({ title, text, children }) {
  return (
    <fieldset className="card p-6">
      <legend className="float-left w-full text-lg font-bold text-navy">{title}</legend>
      {text && <p className="clear-both pt-1 text-sm text-slate-600">{text}</p>}
      <div className="clear-both grid gap-4 pt-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { reload: reloadPublic } = useSettings();
  const { data, loading, error, reload } = useFetch(getSettings, []);
  const [logo, setLogo] = useState([]);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(settingsSchema) });
  const methods = useFieldArray({ control, name: 'paymentMethods' });
  const posMethods = useFieldArray({ control, name: 'pos.paymentMethods' });

  useEffect(() => {
    if (!data) return;
    reset(toForm(data));
    setLogo(data.logoUrl ? [data.logoUrl] : []);
  }, [data, reset]);

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const saved = await updateSettings({ ...values, currency: values.currency.toUpperCase(), logoUrl: logo[0] || '' });
      reset(toForm(saved));
      setLogo(saved.logoUrl ? [saved.logoUrl] : []);
      reloadPublic();
      toast.success('Dejinta waa la kaydiyey');
    } catch (err) {
      applyServerErrors(err, setError);
      setServerError(err);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const num = { valueAsNumber: true };
  const logoChanged = (data?.logoUrl || '') !== (logo[0] || '');
  const pmError = errors.paymentMethods?.root?.message || errors.paymentMethods?.message;
  const posPmError = errors.pos?.paymentMethods?.root?.message || errors.pos?.paymentMethods?.message;

  return (
    <AdminPage title="Dejinta" text="Xogta shirkadda, gaarsiinta, lacag bixinta iyo qoraalka boggaga.">
      <DataState loading={loading && !data} error={error} onRetry={reload}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {!isAdmin && <Alert type="info">Waad arki kartaa dejinta, laakiin kaliya maamulaha ayaa beddeli kara.</Alert>}
          {serverError && <Alert>{serverError.message}</Alert>}

          <Card title="Shirkadda">
            <Input label="Magaca shirkadda" required error={errors.companyName?.message} {...register('companyName')} />
            <Input label="Qoraalka hoose (tagline)" error={errors.tagline?.message} {...register('tagline')} />
            <Input label="Ogeysiiska sare ee bogga" hint="Waxaa lagu muujiyaa xariijinta sare ee website-ka." error={errors.announcement?.message} {...register('announcement')} className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <ImageUploader value={logo} onChange={(list) => setLogo(list.slice(-1))} max={1} />
            </div>
          </Card>

          <Card title="Xiriirka">
            <Input label="Taleefan" type="tel" placeholder="+252 61 XXXXXXX" error={errors.phone?.message} {...register('phone')} />
            <Input label="Lambarka WhatsApp" inputMode="numeric" placeholder="25261XXXXXXX" hint="Lambarro kaliya, oo leh koodhka waddanka, “+” la'aan." error={errors.whatsappNumber?.message} {...register('whatsappNumber')} />
            <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Saacadaha shaqada" placeholder="Sabti - Khamiis, 7:00 - 18:00" error={errors.businessHours?.message} {...register('businessHours')} />
            <Input label="Cinwaanka bakhaarka" error={errors.address?.message} {...register('address')} className="sm:col-span-2" />
            <Input label="Link-ga khariidadda" type="url" placeholder="https://maps.google.com/…" hint="Link Google Maps ah. Haddii uu yahay link “embed”, khariidadda ayaa bogga lagu dhex muujinayaa." error={errors.mapUrl?.message} {...register('mapUrl')} className="sm:col-span-2" />
          </Card>

          <Card title="Lacagta iyo gaarsiinta">
            <Input label="Lacagta (currency)" placeholder="USD" maxLength={5} error={errors.currency?.message} {...register('currency')} />
            <Input label="Kharashka gaarsiinta" type="number" min="0" step="0.01" error={errors.deliveryFee?.message} {...register('deliveryFee', num)} />
            <Input label="Xadka gaarsiinta bilaashka ah" type="number" min="0" step="0.01" hint="0 = gaarsiin bilaash ah ma jirto." error={errors.freeDeliveryThreshold?.message} {...register('freeDeliveryThreshold', num)} />
            <Input label="Xadka kaydka yar (default)" type="number" min="0" step="any" hint="Waxaa loo isticmaalaa alaabta cusub." error={errors.lowStockDefault?.message} {...register('lowStockDefault', num)} />
          </Card>

          <fieldset className="card p-6">
            <legend className="float-left w-full text-lg font-bold text-navy">Hababka lacag bixinta (dalabyada online)</legend>
            <p className="clear-both pt-1 text-sm text-slate-600">Kuwa shaqeynaya oo kaliya ayaa macaamiisha la tusaa. Website-kani lacag online ah ma qaado; kuwani waa habab gacanta lagu maareeyo.</p>
            <ul className="mt-4 space-y-3">
              {methods.fields.map((field, i) => (
                <li key={field.id} className="grid items-start gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <Input label="Magaca la tusayo macmiilka" error={errors.paymentMethods?.[i]?.label?.message} {...register(`paymentMethods.${i}.label`)} />
                  <Input label="Koodhka" hint="Tusaale: bank_transfer" error={errors.paymentMethods?.[i]?.code?.message} {...register(`paymentMethods.${i}.code`)} />
                  <Checkbox label="Shaqeynaya" className="sm:pt-8" {...register(`paymentMethods.${i}.enabled`)} />
                  <Button variant="ghost" className="text-red-700 hover:bg-red-50 sm:mt-6" onClick={() => methods.remove(i)} disabled={methods.fields.length <= 1} aria-label="Ka saar habkan">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
            {pmError && <p className="mt-2 text-xs font-medium text-red-600">{pmError}</p>}
            <Button variant="outline" size="sm" className="mt-3" onClick={() => methods.append({ code: '', label: '', enabled: true })} disabled={methods.fields.length >= 10}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Ku dar hab
            </Button>
          </fieldset>

          <fieldset className="card p-6">
            <legend className="float-left w-full text-lg font-bold text-navy">Kaashka (POS)</legend>
            <p className="clear-both pt-1 text-sm text-slate-600">Siyaasadda qiimo-dhimista, shifts, rasiidka, iyo hababka lacag bixinta ee kaashka.</p>
            <div className="grid gap-4 pt-4 sm:grid-cols-2">
              <Checkbox label="Shift furan waa qasab si wax loo iibiyo" hint="Waxaa lagula talinayaa: sidaas ayaa lacagta caddaanka ah lagu xisaabiyaa." {...register('pos.requireOpenShift')} />
              <Checkbox label="Oggolow qiimo-dhimis" hint="Haddii la damiyo, qofna kama bixin karo qiimo-dhimis kaashka." {...register('pos.discountsEnabled')} />
              <Input label="Xadka kaashiyaha (%)" type="number" min="0" max="100" step="0.5" hint="Ka badan tan waxay u baahan tahay oggolaansho maamule ama manager." error={errors.pos?.cashierMaxDiscountPercent?.message} {...register('pos.cashierMaxDiscountPercent', num)} />
              <Input label="Xadka guud ee ugu badan (%)" type="number" min="0" max="100" step="0.5" hint="Qofna kama gudbi karo, xitaa oggolaansho kadib." error={errors.pos?.maxDiscountPercent?.message} {...register('pos.maxDiscountPercent', num)} />
              <Input label="Qoraalka hoose ee rasiidka" maxLength={200} error={errors.pos?.receiptFooter?.message} {...register('pos.receiptFooter')} className="sm:col-span-2" />
            </div>
            <p className="label mt-5">Hababka lacag bixinta ee kaashka</p>
            <p className="text-xs text-slate-500">“Nooca” wuxuu go'aamiyaa xisaabinta shift-ka: kaliya “Caddaan” ayaa lagu daraa lacagta khasnadda.</p>
            <ul className="mt-3 space-y-3">
              {posMethods.fields.map((field, i) => (
                <li key={field.id} className="grid items-start gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
                  <Input label="Magaca" error={errors.pos?.paymentMethods?.[i]?.label?.message} {...register(`pos.paymentMethods.${i}.label`)} />
                  <Input label="Koodhka" error={errors.pos?.paymentMethods?.[i]?.code?.message} {...register(`pos.paymentMethods.${i}.code`)} />
                  <Select label="Nooca" {...register(`pos.paymentMethods.${i}.type`)}>
                    {Object.entries(PAYMENT_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                  <Checkbox label="Shaqeynaya" className="sm:pt-8" {...register(`pos.paymentMethods.${i}.enabled`)} />
                  <Button variant="ghost" className="text-red-700 hover:bg-red-50 sm:mt-6" onClick={() => posMethods.remove(i)} disabled={posMethods.fields.length <= 1} aria-label="Ka saar habkan">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
            {posPmError && <p className="mt-2 text-xs font-medium text-red-600">{posPmError}</p>}
            <Button variant="outline" size="sm" className="mt-3" onClick={() => posMethods.append({ code: '', label: '', type: 'other', enabled: true })} disabled={posMethods.fields.length >= 10}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Ku dar hab
            </Button>
          </fieldset>

          <Card title="Bogga “Nagu Saabsan”" text="Qor xogta dhabta ah ee shirkadda. Haddii aad madhan ka tagto, bogga wuxuu muujinayaa qoraal dhexdhexaad ah.">
            <Textarea label="Hordhaca shirkadda" rows={5} error={errors.aboutIntro?.message} {...register('aboutIntro')} className="sm:col-span-2" />
            <Textarea label="Himilada (mission)" rows={4} error={errors.mission?.message} {...register('mission')} />
            <Textarea label="Aragtida (vision)" rows={4} error={errors.vision?.message} {...register('vision')} />
          </Card>

          <Card title="Baraha bulshada">
            <Input label="Facebook" type="url" placeholder="https://" error={errors.socialLinks?.facebook?.message} {...register('socialLinks.facebook')} />
            <Input label="Instagram" type="url" placeholder="https://" error={errors.socialLinks?.instagram?.message} {...register('socialLinks.instagram')} />
            <Input label="TikTok" type="url" placeholder="https://" error={errors.socialLinks?.tiktok?.message} {...register('socialLinks.tiktok')} />
          </Card>

          {isAdmin && (
            <div className="no-print sticky bottom-4 z-10 flex justify-end">
              <Button type="submit" size="lg" loading={isSubmitting} disabled={!isDirty && !logoChanged} className="shadow-lift">
                <Save className="h-4 w-4" aria-hidden="true" /> Kaydi dejinta
              </Button>
            </div>
          )}
        </form>
      </DataState>
    </AdminPage>
  );
}
