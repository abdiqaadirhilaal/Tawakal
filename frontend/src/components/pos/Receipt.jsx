import { createPortal } from 'react-dom';
import { LogoMark } from '../common/Logo';
import { imageUrl } from '../../utils/image';
import { formatDate, formatMoney, formatQty, unitLabel } from '../../utils/format';

export const companyFromConfig = (config) => ({
  name: config?.companyName || 'TAWAKAL',
  tagline: config?.tagline || '',
  logoUrl: config?.logoUrl || '',
  phone: config?.phone || '',
  address: config?.address || '',
  footer: config?.receiptFooter || '',
});

// Rasiidka iibka. Waxaa loo isticmaalaa muuqaalka shaashadda iyo daabacaadda labadaba.
export default function Receipt({ sale, company }) {
  const cur = sale.currency;
  const isCash = sale.paymentMethod.type === 'cash';
  return (
    <div className="receipt">
      <div className="rc-center">
        {company.logoUrl ? (
          <img src={imageUrl(company.logoUrl)} alt="" style={{ height: 44, margin: '0 auto 4px', objectFit: 'contain' }} />
        ) : (
          <LogoMark className="mx-auto mb-1 h-11 w-11" />
        )}
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.08em' }}>{company.name}</div>
        {company.tagline && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em' }}>{company.tagline}</div>}
        {company.address && <div>{company.address}</div>}
        {company.phone && <div>Tel: {company.phone}</div>}
      </div>

      <div className="rc-rule" />
      <div className="rc-row">
        <span>Rasiid</span>
        <strong>{sale.receiptNumber}</strong>
      </div>
      <div className="rc-row">
        <span>Iib</span>
        <span>{sale.saleNumber}</span>
      </div>
      <div className="rc-row">
        <span>Taariikh</span>
        <span>{formatDate(sale.completedAt, true)}</span>
      </div>
      <div className="rc-row">
        <span>Kaashiye</span>
        <span>{sale.cashierName}</span>
      </div>
      {(sale.customerName || sale.customerPhone) && (
        <div className="rc-row">
          <span>Macmiil</span>
          <span>{[sale.customerName, sale.customerPhone].filter(Boolean).join(' · ')}</span>
        </div>
      )}

      <div className="rc-rule" />
      <table>
        <tbody>
          {sale.items.map((i) => (
            <tr key={i.sku}>
              <td>
                <div style={{ fontWeight: 700 }}>{i.name}</div>
                <div>
                  {i.sku} · {formatQty(i.quantity)} {unitLabel(i.unit)} x {formatMoney(i.unitPrice, cur)}
                </div>
              </td>
              <td className="rc-num">{formatMoney(i.lineTotal, cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rc-rule" />
      <div className="rc-row">
        <span>Wadarta alaabta</span>
        <span className="rc-num">{formatMoney(sale.subtotal, cur)}</span>
      </div>
      {sale.totalDiscount > 0 && (
        <div className="rc-row">
          <span>Qiimo-dhimis{sale.discount.kind === 'percent' ? ` (${sale.discount.value}%)` : ''}</span>
          <span className="rc-num">-{formatMoney(sale.totalDiscount, cur)}</span>
        </div>
      )}
      <div className="rc-row rc-total">
        <span>WADARTA GUUD</span>
        <span className="rc-num">{formatMoney(sale.grandTotal, cur)}</span>
      </div>

      <div className="rc-rule" />
      <div className="rc-row">
        <span>Lacag bixin</span>
        <span>{sale.paymentMethod.label}</span>
      </div>
      {isCash ? (
        <>
          <div className="rc-row">
            <span>La helay</span>
            <span className="rc-num">{formatMoney(sale.amountReceived, cur)}</span>
          </div>
          <div className="rc-row">
            <span>Baaqi la celiyey</span>
            <span className="rc-num">{formatMoney(sale.changeGiven, cur)}</span>
          </div>
        </>
      ) : (
        sale.paymentReference && (
          <div className="rc-row">
            <span>Tixraac</span>
            <span>{sale.paymentReference}</span>
          </div>
        )
      )}
      {sale.refundedAmount > 0 && (
        <div className="rc-row" style={{ fontWeight: 700 }}>
          <span>La celiyey</span>
          <span className="rc-num">-{formatMoney(sale.refundedAmount, cur)}</span>
        </div>
      )}

      {company.footer && (
        <>
          <div className="rc-rule" />
          <div className="rc-center" style={{ fontWeight: 700 }}>
            {company.footer}
          </div>
        </>
      )}
    </div>
  );
}

// Nuqulka daabacaadda: wuxuu ku yaal bannaanka #root, sidaas darteed marka la daabacayo
// rasiidka oo kaliya ayaa soo baxa (eeg index.css).
export function ReceiptPrintPortal({ sale, company }) {
  if (!sale || typeof document === 'undefined') return null;
  return createPortal(
    <div className="only-print receipt-print">
      <Receipt sale={sale} company={company} />
    </div>,
    document.body
  );
}
