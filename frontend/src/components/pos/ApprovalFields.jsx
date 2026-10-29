import { ShieldCheck } from 'lucide-react';
import { Input } from '../common/Field';

// Oggolaanshaha maamule/manager. Furaha waxaa lagu hubiyaa server-ka, laguma kaydiyo browser-ka.
export default function ApprovalFields({ value, onChange, title = 'Oggolaansho maamule ayaa loo baahan yahay', errors = {} }) {
  return (
    <fieldset className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <legend className="flex items-center gap-2 px-1 text-sm font-bold text-amber-900">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" /> {title}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Email-ka maamulaha" type="email" autoComplete="off" value={value.email} error={errors.email} onChange={(e) => onChange({ ...value, email: e.target.value })} />
        <Input label="Furaha sirta ah" type="password" autoComplete="new-password" value={value.password} error={errors.password} onChange={(e) => onChange({ ...value, password: e.target.value })} />
      </div>
    </fieldset>
  );
}

export const approvalReady = (a) => /\S+@\S+\.\S+/.test(a.email) && a.password.length > 0;
