import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogoMark } from '../../components/common/Logo';
import Button from '../../components/common/Button';
import { Alert, Spinner } from '../../components/common/Feedback';
import { Input } from '../../components/common/Field';
import { useAuth } from '../../context/AuthContext';
import usePageMeta from '../../hooks/usePageMeta';
import { loginSchema } from '../../schemas/admin';
import { homeFor } from '../../utils/roles';

export default function Login() {
  usePageMeta('Soo gal');
  const { user, checking, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  // Boggii la rabay haddii uu jiro; haddii kale bogga ku habboon doorka (kaashiye -> POS).
  const wanted = typeof location.state?.from === 'string' && location.state.from.startsWith('/admin') ? location.state.from : null;
  const target = (u) => (wanted && wanted !== '/admin' ? wanted : homeFor(u));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  }
  if (user) return <Navigate to={target(user)} replace />;

  const onSubmit = async (values) => {
    setError(null);
    try {
      navigate(target(await login(values)), { replace: true });
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-navy px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <LogoMark className="h-16 w-16" />
          <p className="mt-4 font-display text-2xl font-extrabold tracking-[0.1em]">TAWAKAL</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-gold">Building Materials & Supplies</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 rounded-2xl bg-white p-6 shadow-lift sm:p-8">
          <h1 className="text-xl font-extrabold text-navy">Soo gal maamulka</h1>
          {error && <Alert>{error.message}</Alert>}
          <Input label="Email" type="email" autoComplete="username" required error={errors.email?.message} {...register('email')} />
          <Input label="Furaha sirta ah" type="password" autoComplete="current-password" required error={errors.password?.message} {...register('password')} />
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Soo gal
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-white/70">
          <Link to="/" className="hover:text-white">
            ← Ku noqo website-ka
          </Link>
        </p>
      </div>
    </div>
  );
}
