import { useCallback, useEffect, useRef, useState } from 'react';

// Wuxuu socodsiiyaa fetcher() mar kasta oo deps isbeddelaan. Wuxuu iska indho tiraa
// jawaabaha duugoobay (codsi hore oo ka daahay mid cusub).
export default function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const id = ++latest.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(fetcher)
      .then((data) => {
        if (id === latest.current) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (id === latest.current) setState((s) => ({ data: s.data, loading: false, error }));
      });
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload, setData };
}
