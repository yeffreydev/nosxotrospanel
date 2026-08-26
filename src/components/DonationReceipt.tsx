import { Button, Modal } from './ui';
import { formatDateTime } from '../lib/format';
import s from './DonationReceipt.module.css';

/** Todo lo que el comprobante necesita mostrar; se arma al registrar el
 * ingreso o desde un movimiento del historial (reimpresión). */
export interface ReceiptData {
  /** Código público de la donación: numera el comprobante y sirve para rastrearla. */
  code: string;
  /** Fecha del ingreso (ISO). */
  date: string;
  centerName: string;
  centerAddress?: string;
  campaignTitle?: string;
  itemName: string;
  quantity: number;
  unit?: string;
  anonymous: boolean;
  donorName?: string | null;
  donorPhone?: string | null;
  donorEmail?: string | null;
  /** Quién recibió la donación (staff). */
  receivedBy?: string | null;
}

function ReceiptBody({ data }: { data: ReceiptData }) {
  return (
    <div className={s.receipt}>
      <div className={s.brandRow}>
        <div>
          <div className={s.brand}>NOS×OTROS</div>
          <div className={s.code}>Comprobante N.º {data.code}</div>
        </div>
        <div className={s.docTitle}>
          <strong>Donación en especie</strong>
          <span className={s.code}>{formatDateTime(data.date)}</span>
        </div>
      </div>

      <div className={s.grid}>
        <div className={s.field}>
          <span>Donante</span>
          <strong>{data.anonymous ? 'Anónimo' : data.donorName || '—'}</strong>
          {!data.anonymous && data.donorPhone && <div>Tel. {data.donorPhone}</div>}
          {!data.anonymous && data.donorEmail && <div>{data.donorEmail}</div>}
        </div>
        <div className={s.field}>
          <span>Centro de acopio</span>
          <strong>{data.centerName}</strong>
          {data.centerAddress && <div>{data.centerAddress}</div>}
        </div>
        {data.campaignTitle && (
          <div className={s.field}>
            <span>Campaña</span>
            <strong>{data.campaignTitle}</strong>
          </div>
        )}
        {data.receivedBy && (
          <div className={s.field}>
            <span>Recibido por</span>
            <strong>{data.receivedBy}</strong>
          </div>
        )}
      </div>

      <table className={s.table}>
        <thead>
          <tr>
            <th>Producto donado</th>
            <th style={{ textAlign: 'right' }}>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{data.itemName}</td>
            <td className={s.num}>
              {data.quantity} {data.unit ?? 'unidad'}
            </td>
          </tr>
        </tbody>
      </table>

      <div className={s.signatures}>
        <div className={s.signature}>Recibido por (firma)</div>
        <div className={s.signature}>Donante (firma)</div>
      </div>

      <p className={s.footNote}>
        Gracias por tu donación. Con el código de este comprobante puedes seguir su recorrido
        hasta la entrega en la web de NOSXOTROS, sección «Consultar donación».
      </p>
    </div>
  );
}

/**
 * Comprobante imprimible de una donación en especie entregada en un centro de
 * acopio.
 *
 * En pantalla el comprobante vive dentro del modal, pero esa copia NO se
 * imprime: el modal anima con transform/backdrop-filter y degrada el
 * posicionamiento del área de impresión. Se imprime una segunda copia
 * renderizada fuera del modal (oculta en pantalla), y la marca
 * nx-print-receipt en el body silencia las demás áreas .nx-print-area
 * (p. ej. el inventario abierto detrás) mientras dura la impresión.
 */
export function DonationReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const print = () => {
    document.body.classList.add('nx-print-receipt');
    try {
      window.print();
    } finally {
      document.body.classList.remove('nx-print-receipt');
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Comprobante de donación"
        footer={
          <>
            <Button variant="subtle" onClick={onClose}>
              Cerrar
            </Button>
            <Button icon="download" onClick={print}>
              Imprimir comprobante
            </Button>
          </>
        }
      >
        <ReceiptBody data={data} />
      </Modal>
      <div className={`nx-print-area nx-receipt ${s.printCopy}`} aria-hidden="true">
        <ReceiptBody data={data} />
      </div>
    </>
  );
}
