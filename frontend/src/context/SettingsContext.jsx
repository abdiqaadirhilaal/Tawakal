import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getPublicSettings } from '../services/publicApi';

const DEFAULTS = {
  companyName: 'TAWAKAL',
  tagline: 'BUILDING MATERIALS & SUPPLIES',
  logoUrl: '',
  announcement: '',
  phone: '',
  whatsappNumber: '',
  email: '',
  address: '',
  businessHours: '',
  mapUrl: '',
  aboutIntro: '',
  mission: '',
  vision: '',
  currency: 'USD',
  deliveryFee: 0,
  freeDeliveryThreshold: 0,
  paymentMethods: [],
  socialLinks: { facebook: '', instagram: '', tiktok: '' },
};

const SettingsContext = createContext({ settings: DEFAULTS, loading: true, error: null, reload: () => {} });

export function SettingsProvider({ children }) {
  const [state, setState] = useState({ settings: DEFAULTS, loading: true, error: null });

  const reload = useCallback(() => {
    getPublicSettings()
      .then((data) => setState({ settings: { ...DEFAULTS, ...data }, loading: false, error: null }))
      .catch((error) => setState((s) => ({ ...s, loading: false, error })));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(() => ({ ...state, reload }), [state, reload]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
