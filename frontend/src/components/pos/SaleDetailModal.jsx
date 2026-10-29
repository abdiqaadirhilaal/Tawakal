import { useState } from 'react';
import { Printer, Undo2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { ErrorState, Spinner } from '../common/Feedback';
import { Badge } from '../common/StatusBadge';
import Receipt, { ReceiptPrintPortal } from './Receipt';
import RefundModal from './RefundModal';
import { useToast } from '../../context/ToastContext';
import useFetch from '../../hooks/useFetch';
import { getReceipt, getSale } from '../../services/posApi';
import { SALE_STATUS_LABELS, formatDate, formatMoney, formatQty, unitLabel } from '../../utils/format';

export const SALE_STATUS_CLS = {
  completed: 'bg-emerald-100 text-emerald-900',
  partially_refunded: 'bg-amber-100 text-amber-900',
  refunded: 'bg-red-100 text-red-900',
};
export const SaleStatusBadge = ({ status }) => <Badge className={SALE_STATUS_CLS[status]}>{SALE_STATUS_LABELS[status] || status}</Badge>;

export default function SaleDetailModal({ saleId, methods, onClose, onChanged }) {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useFetch(
    () => (saleId ? Promise.all([getSale(saleId), getReceipt(saleId)]).then(([detail, r]) => ({ ...detail, company: r.company })) : Promise.resolve(null)),
    [saleId]
  );
  const [receipt, setReceipt] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [refunding, setRefunding] = useState(false);

  // Dib-u-daabacaadda waxaa laga soo qaadaa server-ka (halkaas ayaa lagu hubiyaa awoodda, laguna diiwaangeliyaa).
  const reprint = async () => {
    setPrinting(true);
    try {
      setReceipt(await getReceipt(saleId, true));
      setTimeout(() => window.print(), 80);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPrinting(false);
    }
  };

  const sale = data?.sale;
  if (refunding && sale) {
    return (
      <RefundModal
        sale={sale}
        methods={methods}
        onClose={() => setRefunding(false)}
        onDone={(res) => {
          setRefunding(false);
          setData((d) => ({ ...d, sale: res.sale, refunds: [...(d?.refunds || []), res.refund] }));
          toast.success(`Celinta ${res.refund.refundNumber} waa la diiwaangeliyey`);
          onChanged?.();
        }}
      />
    );
  }

  return (
    <>
      <Modal
        open={Boolean(saleId)}
        onClose={onClose}
        size="lg"
        title={sale ? `Iib ${sale.receiptNumber}` : 'Faahfaahinta iibka'}
        footer={
          sale && (
            <>
              {sale.status !== 'refunded' && (
                <Button variant="outline" className="text-red-700 hover:border-red-500 hover:text-red-700" onClick={() => setRefunding(true)}>
                  <Undo2 className="h-4 w-4" aria-hidden="true" /> Celin
                </Button>
              )}
              <Button onClick={reprint} loading={printing}>
                <Printer className="h-4 w-4" aria-hidden="true" /> Daabac rasiidka
              </Button>
            </>
          )
        }
      >
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading || !sale ? (
          <Spinner />
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <SaleStatusBadge status={sale.status} />
                {sale.paymentVerification === 'recorded_unverified' && <Badge className="bg-slate-200 text-slate-800">Lacagta: kaashiyaha ayaa diiwaangeliyey</Badge>}
                {sale.discount.approvedByName && <Badge className="bg-royal-100 text-royal-800">Dhimis: {sale.discount.approvedByName} ayaa oggolaaday</Badge>}
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Alaabta</h3>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {sale.items.map((i) => (
                    <li key={i.productId} className="flex justify-between gap-3 py-2">
                      <span>
                        <span className="font-semibold text-navy">{i.name}</span>
                        <span className="num block text-xs text-slate-500">
                          {i.sku} · {formatQty(i.quantity)} {unitLabel(i.unit)} x {formatMoney(i.unitPrice, sale.currency)}
                          {i.refundedQuantity > 0 && ` · la celiyey ${formatQty(i.refundedQuantity)}`}
                        </span>
                      </span>
                      <span className="num font-bold text-navy">{formatMoney(i.lineTotal, sale.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Celinta ({data.refunds.length})</h3>
                {data.refunds.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Celin laguma samayn iibkan.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {data.refunds.map((r) => (
                      <li key={r.id} className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="num font-bold text-navy">{r.refundNumber}</span>
                          <span className="num font-extrabold text-red-700">-{formatMoney(r.amount, r.currency)}</span>
                        </div>
                        <p className="text-slate-700">{r.reason}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(r.createdAt, true)} · {r.method.label} · {r.processedByName}
                          {r.approvedByName && ` · oggolaaday ${r.approvedByName}`}
                          {r.inventoryRestocked ? ' · kaydka waa lagu celiyey' : ' · kaydka laguma celin'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <Receipt sale={sale} company={data.company} />
            </div>
          </div>
        )}
      </Modal>
      {receipt && <ReceiptPrintPortal sale={receipt.sale} company={receipt.company} />}
    </>
  );
}
