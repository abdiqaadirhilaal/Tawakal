import { useEffect, useState } from 'react';
import { getProduct } from '../services/publicApi';
import { useCart } from '../context/CartContext';

// Marka dambiisha ama checkout-ka la furo, ka soo qaad server-ka qiimaha iyo kaydka
// hadda jira ee alaab kasta, si waxa la muujinayo ay u noqdaan kuwo cusub.
export default function useCartSync() {
  const { items, sync } = useCart();
  const [syncing, setSyncing] = useState(items.length > 0);
  const ids = items.map((i) => i.productId).sort().join(',');

  useEffect(() => {
    if (!ids) {
      setSyncing(false);
      return undefined;
    }
    let alive = true;
    setSyncing(true);
    Promise.all(
      ids.split(',').map((id) =>
        getProduct(id)
          .then((d) => [id, d.product])
          .catch((err) => [id, err.status === 404 ? null : undefined])
      )
    ).then((entries) => {
      if (!alive) return;
      sync(Object.fromEntries(entries));
      setSyncing(false);
    });
    return () => {
      alive = false;
    };
  }, [ids, sync]);

  return syncing;
}
