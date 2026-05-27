import { useState, useEffect } from 'react';
import { Inbox, Truck, CheckCircle2, XCircle, Clock, Copy, ClipboardCheck, Circle, Minus, FileCode } from 'lucide-react';
import { api } from '../api';
import { canVehicleCarryLoad } from '../utils/capacity';
import { useToast } from '../components/Toast';
import { usePolling } from '../hooks/usePolling';
import VehiclePickerModal from '../components/VehiclePickerModal';

const VEHICLE_TYPE_STYLE = {
  'L300':       'bg-blue-500/20 text-blue-400',
  'Truck':      'bg-orange-500/20 text-orange-400',
  'Expander':   'bg-purple-500/20 text-purple-400',
  'Motorcycle': 'bg-green-500/20 text-green-400',
};

const STATUS_STYLE = {
  'Pending':  'bg-yellow-500/20 text-yellow-400',
  'Accepted': 'bg-green-500/20 text-green-400',
  'Rejected': 'bg-red-500/20 text-red-400',
};

const dash = (v) => (v && String(v).trim() ? v : '—');

// Format raw weight — everything is kg
function formatWeight(value) {
  if (value == null || value === '') return '—';
  const s = String(value).trim();
  if (/^[\d.]+\s*kg$/i.test(s)) return s; // already has kg
  const n = parseFloat(s);
  if (isNaN(n)) return s;
  return `${n} kg`;
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-muted-app uppercase tracking-wide">{label}</p>
      <p className="text-xs text-app mt-0.5 break-words">{dash(value)}</p>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-input rounded-lg px-4 py-3 space-y-3">
      <div>
        <p className="text-[10px] font-semibold text-secondary-app uppercase tracking-wide">{title}</p>
        {subtitle && <p className="text-[10px] text-muted-app mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function VehicleDropdown({ value, onChange, vehicles, loadWeight }) {
  const [open, setOpen] = useState(false);
  const selected = vehicles.find(v => v._id === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-hover border border-app text-secondary-app hover:bg-hover transition cursor-pointer min-w-[180px] justify-between"
      >
        <span className="flex items-center gap-1.5">
          {selected?.image
            ? <img src={api.imageUrl(selected.image)} alt={selected.name} className="w-5 h-5 object-contain rounded" />
            : <Truck size={11} className="text-muted-app" />}
          {selected ? `${selected.name} · ${selected.plate}` : 'Assign vehicle...'}
        </span>
        <span className="text-[10px] text-muted-app">▾</span>
      </button>

      {open && (
        <VehiclePickerModal
          vehicles={vehicles}
          selected={value}
          loadWeight={loadWeight}
          onSelect={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function generateX12_204(tender) {
  // If raw X12 was stored (partner sent actual X12), show it directly
  if (tender.rawEdi && tender.rawEdi.includes('ISA*')) {
    return tender.rawEdi
      .replace(/\r\n/g, '\n')
      .replace(/~\n/g, '~\n')
      .replace(/~([^\n])/g, '~\n$1')
      .trim();
  }
  const pad     = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  const fmtDate = (d) => d ? new Date(d).toISOString().slice(0,10).replace(/-/g,'') : '00000000';
  const today   = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const time    = new Date().toTimeString().slice(0,5).replace(':','');

  const rj  = tender.rawJson || {};

  // Hiraya nested format
  const ts  = rj?.transaction_set;
  const sd  = ts?.shipment_details;
  const ref = ts?.reference_numbers;
  const wt  = ts?.weight_and_quantity;
  const sh  = ts?.parties?.shipper;
  const cn  = ts?.parties?.consignee;
  const dt  = ts?.dates;
  const ic  = rj?.interchange;

  // Flat format (Surplus, Bulldog, Newforge) — falls back to DB fields
  const o = tender.originAddress || {};

  const isaId   = (ic?.sender_id ?? tender.partner?.isaId ?? 'PARTNER').toUpperCase();
  const ctrlNum = (ic?.control_number ?? tender.ediRef ?? 'TRX-000001').replace('TRX-','').padStart(9,'0');

  const shipId    = sd?.shipment_identification_number ?? ref?.bill_of_lading_number ?? rj.shipmentId ?? tender.shipmentId ?? '';
  const orderId   = ref?.purchase_order_number ?? rj.orderId ?? tender.orderId ?? '';
  const route     = ref?.route_description ?? rj.route ?? tender.route ?? '';
  const commodity = ref?.commodity_description ?? rj.commodity ?? tender.commodity ?? '';
  const carrierId = ref?.carrier_assigned_number ?? rj.carrierId ?? tender.carrierId ?? '';
  const scac      = ref?.standard_carrier_alpha_code ?? sd?.scac_code ?? rj.carrierScac ?? rj.scacCode ?? tender.carrierScac ?? '';
  const rawWeight = wt?.weight ?? rj.weight ?? tender.weight ?? '';
  const weight    = String(rawWeight).replace(/[^0-9.]/g, '');

  // Origin — Hiraya nested vs flat
  const shName    = sh?.name ?? o.locationName ?? rj.originAddress?.locationName ?? '';
  const shCity    = sh?.address?.city ?? o.city ?? rj.originAddress?.city ?? '';
  const shState   = sh?.address?.state_province ?? o.region ?? rj.originAddress?.region ?? '';
  const shZip     = sh?.address?.postal_code ?? o.zipCode ?? rj.originAddress?.zipCode ?? '';
  const shContact = sh?.contact?.name ?? o.contactPerson ?? rj.originAddress?.contactPerson ?? rj.originAddress?.contactName ?? '';
  const shPhone   = sh?.contact?.communication_number ?? o.contactPhone ?? rj.originAddress?.contactPhone ?? '';
  const shStreet  = sh?.address?.street ?? rj.originAddress?.street ?? rj.originAddress?.facilityName ?? o.locationName ?? '';

  // Destination — Hiraya nested vs flat
  const destRaw    = rj.destinationAddress || {};
  const destCity   = cn?.address?.city ?? destRaw.city ?? (route.split('-')[1]?.trim()) ?? '';
  const destState  = cn?.address?.state_province ?? destRaw.region ?? destRaw.state ?? '';
  const destZip    = cn?.address?.postal_code ?? destRaw.zipCode ?? destRaw.postalCode ?? '';
  // Use EDI-derived consignee name (city + "Consignee"), not the partner's internal name
  const cnName     = cn?.name ?? (destCity ? `${destCity} Consignee` : '');
  const cnContact  = cn?.contact?.name ?? destRaw.contactPerson ?? destRaw.contactName ?? '';
  const cnPhone    = cn?.contact?.communication_number ?? destRaw.contactPhone ?? '';

  // Dates — strip time portion from ISO strings
  const pickupRaw    = dt?.requested_pickup_date   ?? rj.pickupDate   ?? rj.scheduledPickupDate;
  const deliveryRaw  = dt?.requested_delivery_date ?? rj.deliveryDate ?? rj.estimatedDeliveryDate;
  const toEdiDate    = (v) => {
    if (!v) return '00000000';
    const s = String(v);
    // Already YYYYMMDD
    if (/^\d{8}$/.test(s)) return s;
    // ISO or YYYY-MM-DD — take date part only
    return s.slice(0, 10).replace(/-/g, '');
  };
  const pickupDate   = toEdiDate(pickupRaw)   || fmtDate(tender.pickupDate);
  const deliveryDate = toEdiDate(deliveryRaw) || fmtDate(tender.deliveryDate);

  const segments = [
    `ISA*00*${pad('',10)}*00*${pad('',10)}*ZZ*${pad(isaId,15)}*ZZ*${pad('CARGO',15)}*${today.slice(2)}*${time}*^*00501*${ctrlNum}*0*P*>`,
    `GS*SM*${isaId}*CARGO*${today}*${time}*1*X*005010`,
    `ST*204*0001`,
    `B2**${isaId}**${shipId}**PP`,
    orderId   ? `L11*${orderId}*ON`   : null,
    shipId    ? `L11*${shipId}*BM`    : null,
    route     ? `L11*${route}*RT`     : null,
    commodity ? `L11*${commodity}*CN` : null,
    carrierId ? `L11*${carrierId}*CA` : null,
    scac      ? `L11*${scac}*SC`      : null,
    weight    ? `AT8*G*L*${weight}`   : null,
    // Shipper block
    `N1*SH*${shName || isaId}*ZZ*${isaId}`,
    shStreet  ? `N3*${shStreet}`      : null,
    shCity    ? `N4*${shCity}*${shState}*${shZip}*PH` : null,
    shContact ? `PER*CN*${shContact}*TE*${shPhone}`   : null,
    // Consignee block
    destCity  ? `N1*CN*${cnName}*ZZ*CARGO`                        : null,
    destCity  ? `N4*${destCity}*${destState}*${destZip}*PH`       : null,
    cnContact ? `PER*CN*${cnContact}*TE*${cnPhone}`                : null,
    // Dates
    pickupDate   !== '00000000' ? `G62*10*${pickupDate}`   : null,
    deliveryDate !== '00000000' ? `G62*68*${deliveryDate}` : null,
  ].filter(Boolean);

  const seCount = segments.length - 2;
  segments.push(`SE*${seCount}*0001`);
  segments.push(`GE*1*1`);
  segments.push(`IEA*1*${ctrlNum}`);

  return segments.join('~\n') + '~';
}

function get990Json(tender) {
  const base = {
    orderId:     tender.orderId    || tender.shipmentId,
    shipmentId:  tender.shipmentId || '',
    status:      tender.status?.toUpperCase(),
    ...(tender.status === 'Accepted' && tender.estimatedDeliveryDate ? {
      estimatedDeliveryDate: new Date(tender.estimatedDeliveryDate).toISOString().slice(0, 10),
    } : {}),
  };
  if (tender.status === 'Accepted') {
    base.totalAmount = tender.freightRate ?? 0;
    if (tender.assignedVehicle) {
      base.assignedVehicle = {
        vehicleId: tender.assignedVehicle.vehicleId || '',
        name:      tender.assignedVehicle.name      || '',
        type:      tender.assignedVehicle.type      || '',
        plate:     tender.assignedVehicle.plate     || '',
      };
    }
  }
  if (tender.status === 'Rejected' && tender.rejectNotes) {
    base.notes = tender.rejectNotes;
  }
  return base;
}

const PIPELINE_STATE_STYLE = {
  done:     { dot: 'bg-green-500 border-green-500', line: 'bg-green-500/40', text: 'text-green-600' },
  current:  { dot: 'bg-blue-500 border-blue-500 ring-4 ring-blue-500/25', line: 'bg-blue-500/30', text: 'text-blue-600' },
  pending:  { dot: 'bg-input border-app', line: 'bg-pipeline-line-muted', text: 'text-muted-app' },
  skipped:  { dot: 'bg-input border-app', line: 'bg-pipeline-line-muted', text: 'text-muted-app' },
  rejected: { dot: 'bg-red-500 border-red-500', line: 'bg-red-500/30', text: 'text-red-600' },
};

const EDI_214_STATUS = { '214-pickup': 'Pickup', '214-transit': 'In Transit', '214-delivered': 'Delivered' };
const STATUS_MAP_214 = { Pickup: 'PICKUP', 'In Transit': 'IN_TRANSIT', Delivered: 'DELIVERED' };
const DESC_MAP_214 = {
  Pickup: 'Cargo has been picked up from the origin.',
  'In Transit': 'Cargo departed the central warehouse terminal.',
  Delivered: 'Cargo has been delivered to the destination.',
};

function generateX12_214(s) {
  const pad = (v, n) => String(v ?? '').padEnd(n).slice(0, n);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const time = new Date().toTimeString().slice(0, 5).replace(':', '');
  const isaId = (s.partner?.isaId ?? s.partner?.name ?? 'PARTNER').toUpperCase().replace(/\s+/g, '').slice(0, 15);
  const ctrlNum = (s.shipmentId ?? 'SHP-000001').replace(/[^0-9]/g, '').slice(-9).padStart(9, '0');
  const routeParts = (s.route || '').split('-');
  const location = routeParts.length > 1 ? routeParts[routeParts.length - 1].trim() : s.route || '';
  const mappedStatus = STATUS_MAP_214[s.status] ?? s.status?.toUpperCase().replace(/ /g, '_') ?? 'UNKNOWN';
  const desc = DESC_MAP_214[s.status] ?? '';

  const segments = [
    `ISA*00*${pad('', 10)}*00*${pad('', 10)}*ZZ*${pad('CARGO', 15)}*ZZ*${pad(isaId, 15)}*${today.slice(2)}*${time}*^*00501*${ctrlNum}*0*P*>`,
    `GS*QM*CARGO*${isaId}*${today}*${time}*1*X*005010`,
    `ST*214*0001`,
    `B10*${s.shipmentId ?? ''}**CRGO`,
    `L11*${s.shipmentId ?? ''}*BM`,
    `N1*SH*CarGO Logistics Services*ZZ*CARGO`,
    `N1*CN*${isaId}*ZZ*${isaId}`,
    `AT7*${mappedStatus}*NS**${today}*${time}*LT`,
    location ? `MS2*CRGO*${location}` : null,
    s.estimatedDeliveryDate
      ? `G62*68*${new Date(s.estimatedDeliveryDate).toISOString().slice(0, 10).replace(/-/g, '')}`
      : null,
    desc ? `NTE*OTH*${desc}` : null,
    `SE*${desc ? (location ? 10 : 9) : (location ? 9 : 8)}*0001`,
    `GE*1*1`,
    `IEA*1*${ctrlNum}`,
  ].filter(Boolean);

  return segments.join('~\n') + '~';
}

function generateX12_210(inv) {
  const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const time = new Date().toTimeString().slice(0, 5).replace(':', '');
  const isaId = (inv.partner?.isaId ?? inv.partner?.name ?? 'PARTNER').toUpperCase().replace(/\s+/g, '').slice(0, 15);
  const ctrlNum = (inv.invoiceId ?? 'INV-000001').replace('INV-', '').padStart(9, '0');
  const amt = Number(inv.amount ?? 0).toFixed(2);

  const segments = [
    `ISA*00*${pad('', 10)}*00*${pad('', 10)}*ZZ*${pad('CARGO', 15)}*ZZ*${pad(isaId, 15)}*${today.slice(2)}*${time}*^*00501*${ctrlNum}*0*P*>`,
    `GS*IM*CARGO*${isaId}*${today}*${time}*1*X*005010`,
    `ST*210*0001`,
    `B3**${inv.invoiceId ?? ''}**PP*${today}**${amt}*${today}*${isaId}`,
    `C3*PHP`,
    inv.shipment?.shipmentId ? `N9*BM*${inv.shipment.shipmentId}` : null,
    inv.shipment?.route ? `N9*RT*${inv.shipment.route}` : null,
    `N1*BT*${inv.partner?.name ?? isaId}*ZZ*${isaId}`,
    `N1*SF*CarGO Logistics Services*ZZ*CARGO`,
    `L3*${amt}*G***${amt}`,
  ].filter(Boolean);

  const seCount = segments.length - 2;
  segments.push(`SE*${seCount}*0001`);
  segments.push(`GE*1*1`);
  segments.push(`IEA*1*${ctrlNum}`);
  return segments.join('~\n') + '~';
}

function generateX12_820(inv) {
  const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const time = new Date().toTimeString().slice(0, 5).replace(':', '');
  const isaId = (inv.partner?.isaId ?? inv.partner?.name ?? 'PARTNER').toUpperCase().replace(/\s+/g, '').slice(0, 15);
  const ctrlNum = (inv.invoiceId ?? 'INV-000001').replace('INV-', '').padStart(9, '0');
  const amt = Number(inv.amount ?? 0).toFixed(2);

  const segments = [
    `ISA*00*${pad('', 10)}*00*${pad('', 10)}*ZZ*${pad(isaId, 15)}*ZZ*${pad('CARGO', 15)}*${today.slice(2)}*${time}*^*00501*${ctrlNum}*0*P*>`,
    `GS*RA*${isaId}*CARGO*${today}*${time}*1*X*005010`,
    `ST*820*0001`,
    `BPR*C*${amt}*C*ACH***01***${today}`,
    `TRN*1*${inv.invoiceId ?? ''}*${isaId}`,
    `REF*ST*PAID`,
    inv.shipment?.shipmentId ? `REF*BM*${inv.shipment.shipmentId}` : null,
    `DTM*097*${today}`,
    `N1*PE*CarGO Logistics Services*ZZ*CARGO`,
    `N1*PR*${inv.partner?.name ?? isaId}*ZZ*${isaId}`,
    `RMR*IV*${inv.invoiceId ?? ''}**${amt}`,
  ].filter(Boolean);

  const seCount = segments.length - 2;
  segments.push(`SE*${seCount}*0001`);
  segments.push(`GE*1*1`);
  segments.push(`IEA*1*${ctrlNum}`);
  return segments.join('~\n') + '~';
}

function generateX12_997(inv) {
  const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const time = new Date().toTimeString().slice(0, 5).replace(':', '');
  const isaId = (inv.partner?.isaId ?? inv.partner?.name ?? 'PARTNER').toUpperCase().replace(/\s+/g, '').slice(0, 15);
  const ctrlNum = (inv.invoiceId ?? 'INV-000001').replace('INV-', '').padStart(9, '0');

  const segments = [
    `ISA*00*${pad('', 10)}*00*${pad('', 10)}*ZZ*${pad('CARGO', 15)}*ZZ*${pad(isaId, 15)}*${today.slice(2)}*${time}*^*00501*${ctrlNum}*0*P*>`,
    `GS*FA*CARGO*${isaId}*${today}*${time}*1*X*005010`,
    `ST*997*0001`,
    `AK1*IM*1`,
    `AK2*210*0001`,
    `AK5*A`,
    `AK9*A*1*1*1`,
    `SE*6*0001`,
    `GE*1*1`,
    `IEA*1*${ctrlNum}`,
  ];
  return segments.join('~\n') + '~';
}

function isPipelineStepClickable(step) {
  return step.state === 'done' || step.state === 'rejected';
}

function getJson214(s) {
  const routeParts = (s.route || '').split('-');
  const location = routeParts.length > 1 ? routeParts[routeParts.length - 1].trim() : s.route || '';
  return {
    shipmentId: s.shipmentId,
    status: STATUS_MAP_214[s.status] ?? s.status,
    location,
    description: DESC_MAP_214[s.status] ?? '',
    ...(s.estimatedDeliveryDate ? {
      estimatedDeliveryDate: new Date(s.estimatedDeliveryDate).toISOString().slice(0, 10),
    } : {}),
  };
}

function getJson210(inv) {
  return {
    shipmentId: inv.shipment?.shipmentId ?? inv.shipmentId ?? '',
    invoiceId: inv.invoiceId,
    totalAmount: inv.amount,
    dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : null,
    status: inv.status ?? 'Pending',
  };
}

function getJson820(inv) {
  return {
    invoiceNumber: inv.invoiceId,
    shipmentId: inv.shipment?.shipmentId ?? inv.shipmentId ?? '',
    status: 'PAID',
  };
}

function getJson997(inv) {
  return {
    shipmentId: inv.shipment?.shipmentId ?? inv.shipmentId ?? '',
    invoiceId: inv.invoiceId,
    totalAmount: inv.amount,
    dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : null,
    status: inv.status ?? 'Pending',
    pdfUrl: inv.pdfUrl ?? null,
  };
}

function getPipelineStepX12(step, tender, pipeline) {
  if (!isPipelineStepClickable(step)) return null;

  const partner = tender?.partner;
  const ship = pipeline?.shipment;
  const inv = pipeline?.invoice;

  switch (step.key) {
    case '204':
      return generateX12_204(tender);
    case '990':
      return tender.status !== 'Pending' ? generateX12_990(tender) : null;
    case '214-pickup':
    case '214-transit':
    case '214-delivered':
      if (!ship) return null;
      return generateX12_214({
        ...ship,
        partner,
        status: EDI_214_STATUS[step.key],
      });
    case '210':
      if (!inv) return null;
      return generateX12_210({
        ...inv,
        partner,
        shipment: { shipmentId: inv.shipmentId, route: inv.route },
      });
    case '820':
      if (!inv) return null;
      return generateX12_820({
        ...inv,
        partner,
        shipment: { shipmentId: inv.shipmentId, route: inv.route },
      });
    case '997':
      if (!inv) return null;
      return generateX12_997({
        ...inv,
        partner,
        shipment: { shipmentId: inv.shipmentId, route: inv.route },
      });
    default:
      return null;
  }
}

function getPipelineStepJson(step, tender, pipeline) {
  if (!isPipelineStepClickable(step)) return null;

  const partner = tender?.partner;
  const ship = pipeline?.shipment;
  const inv = pipeline?.invoice;

  switch (step.key) {
    case '204':
      return tender.rawJson || tender;
    case '990':
      return tender.status !== 'Pending' ? get990Json(tender) : null;
    case '214-pickup':
    case '214-transit':
    case '214-delivered':
      if (!ship) return null;
      return getJson214({ ...ship, partner, status: EDI_214_STATUS[step.key] });
    case '210':
      if (!inv) return null;
      return getJson210({ ...inv, partner, shipment: { shipmentId: inv.shipmentId, route: inv.route } });
    case '820':
      if (!inv) return null;
      return getJson820({ ...inv, partner, shipment: { shipmentId: inv.shipmentId, route: inv.route } });
    case '997':
      if (!inv) return null;
      return getJson997({ ...inv, partner, shipment: { shipmentId: inv.shipmentId, route: inv.route } });
    default:
      return null;
  }
}

function PipelineIcon({ state }) {
  if (state === 'done') return <CheckCircle2 size={12} className="text-white" />;
  if (state === 'current') return <Clock size={12} className="text-white" />;
  if (state === 'rejected') return <XCircle size={12} className="text-white" />;
  if (state === 'skipped') return <Minus size={12} className="text-muted-app" />;
  return <Circle size={10} className="text-muted-app" />;
}

function EdiPipeline({ pipeline, loading, tender }) {
  const [selectedStepKey, setSelectedStepKey] = useState(null);
  const [viewMode, setViewMode] = useState('x12');
  const [copied, setCopied] = useState(false);

  const fmtStepTime = (at) => at
    ? new Date(at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  if (loading) {
    return (
      <div className="bg-input rounded-xl px-4 py-3 animate-pulse">
        <div className="h-3 w-32 bg-hover rounded mb-3" />
        <div className="h-16 bg-hover rounded-lg" />
      </div>
    );
  }

  const steps = pipeline?.steps ?? [];
  if (!steps.length) return null;

  const selectedStep = steps.find(s => s.key === selectedStepKey) ?? null;
  const selectedX12 = selectedStep ? getPipelineStepX12(selectedStep, tender, pipeline) : null;
  const selectedJson = selectedStep ? getPipelineStepJson(selectedStep, tender, pipeline) : null;
  const hasContent = viewMode === 'x12' ? Boolean(selectedX12) : Boolean(selectedJson);

  const selectStep = (step) => {
    if (!isPipelineStepClickable(step)) return;
    setViewMode('x12');
    setCopied(false);
    setSelectedStepKey(prev => (prev === step.key ? null : step.key));
  };

  const copyContent = () => {
    const text = viewMode === 'x12'
      ? selectedX12
      : JSON.stringify(selectedJson, null, 2);
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-input rounded-xl px-4 py-3 border border-app/50">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-secondary-app uppercase tracking-wide">EDI document pipeline</p>
        {pipeline?.shipment && (
          <span className="text-[10px] font-mono text-muted-app">{pipeline.shipment.shipmentId}</span>
        )}
      </div>
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex min-w-max gap-0">
          {steps.map((step, i) => {
            const style = PIPELINE_STATE_STYLE[step.state] || PIPELINE_STATE_STYLE.pending;
            const isLast = i === steps.length - 1;
            const isSelected = selectedStepKey === step.key;
            const clickable = isPipelineStepClickable(step);
            const stepBody = (
              <>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${style.dot}`}>
                  <PipelineIcon state={step.state} />
                </div>
                <p className={`text-[10px] font-bold mt-1.5 ${style.text}`}>{step.code}</p>
                <p className="text-[9px] text-muted-app text-center leading-tight mt-0.5 px-0.5">{step.label}</p>
                {fmtStepTime(step.at) && (
                  <p className="text-[8px] text-muted-app mt-0.5 text-center leading-tight">{fmtStepTime(step.at)}</p>
                )}
              </>
            );
            return (
              <div key={step.key} className="flex items-start">
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => selectStep(step)}
                    className={`flex flex-col items-center w-[72px] shrink-0 rounded-lg py-1 transition cursor-pointer border-none bg-transparent
                      ${isSelected ? 'ring-1 ring-blue-500/50 bg-blue-500/10' : 'hover:bg-hover'}`}
                  >
                    {stepBody}
                  </button>
                ) : (
                  <div className="flex flex-col items-center w-[72px] shrink-0 rounded-lg py-1 cursor-default opacity-60">
                    {stepBody}
                  </div>
                )}
                {!isLast && (
                  <div className={`h-0.5 w-4 mt-3 shrink-0 rounded ${style.line}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      {pipeline?.invoice && (
        <p className="text-[10px] text-muted-app mt-2 pt-2 border-t border-subtle">
          Invoice <span className="font-mono text-secondary-app">{pipeline.invoice.invoiceId}</span>
          <span className="mx-1">·</span>
          {pipeline.invoice.status}
        </p>
      )}

      {selectedStep && isPipelineStepClickable(selectedStep) && (
        <div className="mt-3 pt-3 border-t border-subtle">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileCode size={12} className="text-blue-400 shrink-0" />
              <span className="text-[10px] font-semibold text-secondary-app uppercase tracking-wide truncate">
                EDI {selectedStep.code} — {selectedStep.label}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex rounded-lg overflow-hidden border border-app text-[10px]">
                <button
                  type="button"
                  onClick={() => { setViewMode('json'); setCopied(false); }}
                  className={`px-2.5 py-1 transition cursor-pointer border-none
                    ${viewMode === 'json' ? 'bg-blue-600 text-white' : 'bg-input text-secondary-app hover:text-app'}`}
                >
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => { setViewMode('x12'); setCopied(false); }}
                  className={`px-2.5 py-1 transition cursor-pointer border-none
                    ${viewMode === 'x12' ? 'bg-blue-600 text-white' : 'bg-input text-secondary-app hover:text-app'}`}
                >
                  ANSI X12
                </button>
              </div>
              {hasContent && (
                <button
                  type="button"
                  onClick={copyContent}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-card border border-app text-secondary-app hover:text-app transition cursor-pointer"
                >
                  {copied ? <ClipboardCheck size={10} className="text-green-400" /> : <Copy size={10} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
          <div className="h-44 overflow-y-auto rounded-lg bg-code-block border border-app px-3 py-2.5">
            {viewMode === 'x12' ? (
              selectedX12 ? (
                <pre className="font-mono text-[11px] text-code-x12 whitespace-pre-wrap break-all leading-relaxed m-0 text-left">
                  {selectedX12}
                </pre>
              ) : (
                <p className="text-[11px] text-muted-app text-center py-6">ANSI X12 preview unavailable.</p>
              )
            ) : selectedJson ? (
              <pre className="font-mono text-[11px] text-code-json whitespace-pre-wrap break-all leading-relaxed m-0 text-left">
                {JSON.stringify(selectedJson, null, 2)}
              </pre>
            ) : (
              <p className="text-[11px] text-muted-app text-center py-6">JSON preview unavailable.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function generateX12_990(tender) {
  const pad     = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  const today   = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const time    = new Date().toTimeString().slice(0,5).replace(':','');
  const isaId   = (tender.partner?.isaId ?? 'PARTNER').toUpperCase();
  const ctrlNum = (tender.ediRef ?? 'TRX-000001').replace('TRX-','').padStart(9,'0');
  const accepted = tender.status === 'Accepted';
  const v = tender.assignedVehicle;
  const amt = tender.freightRate ?? 0;

  const segments = [
    `ISA*00*${pad('',10)}*00*${pad('',10)}*ZZ*${pad('CARGO',15)}*ZZ*${pad(isaId,15)}*${today.slice(2)}*${time}*^*00501*${ctrlNum}*0*P*>`,
    `GS*QO*CARGO*${isaId}*${today}*${time}*1*X*005010`,
    `ST*990*0001`,
    `B1*CRGO*${tender.shipmentId ?? ''}*${today}`,
    tender.orderId ? `L11*${tender.orderId}*ON` : null,
    `L11*${tender.shipmentId ?? ''}*BM`,
    `K1*${accepted ? 'ACCEPTED' : 'REJECTED'}`,
    accepted && v ? `N1*CA*${v.name ?? ''}*ZZ*CRGO` : null,
    accepted && v ? `L11*${v.vehicleId ?? ''}*VH` : null,
    accepted && v ? `L11*${v.plate ?? ''}*LP` : null,
    accepted ? `AMT*SF*${amt}` : null,
    accepted && tender.estimatedDeliveryDate
      ? `G62*68*${new Date(tender.estimatedDeliveryDate).toISOString().slice(0,10).replace(/-/g,'')}`
      : null,
    !accepted && tender.rejectNotes ? `NTE*OTH*${tender.rejectNotes}` : null,
  ].filter(Boolean);

  const seCount = segments.length - 2;
  segments.push(`SE*${seCount}*0001`);
  segments.push(`GE*1*1`);
  segments.push(`IEA*1*${ctrlNum}`);
  return segments.join('~\n') + '~';
}

function TenderDetail({ tender: initialTender, vehicles, onClose, onRespond }) {
  const [tender, setTender] = useState(initialTender);
  const [pipeline, setPipeline] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [vehicle, setVehicle] = useState(initialTender.assignedVehicle?._id ?? null);
  const [loadingAction, setLoadingAction] = useState(null); // 'Accepted' | 'Rejected' | null
  const [showX12, setShowX12] = useState(false);
  const [x12ViewMode, setX12ViewMode] = useState('x12'); // 'x12' | 'json'
  const [copied, setCopied] = useState(false);
  const [show990, setShow990] = useState(false);
  const [view990Mode, setView990Mode] = useState('x12');
  const [copied990, setCopied990] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const copyX12 = () => {
    const content = x12ViewMode === 'x12'
      ? generateX12_204(tender)
      : JSON.stringify(tender.rawJson || tender, null, 2);
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [freshResult, pipeResult] = await Promise.allSettled([
          api.get(`/loadtenders/${initialTender._id}`),
          api.get(`/loadtenders/${initialTender._id}/pipeline`),
        ]);
        if (!cancelled) {
          if (freshResult.status === 'fulfilled') {
            setTender(freshResult.value);
            setVehicle(freshResult.value.assignedVehicle?._id ?? null);
          } else {
            setTender(initialTender);
          }
          if (pipeResult.status === 'fulfilled') setPipeline(pipeResult.value);
        }
      } catch {
        if (!cancelled) setTender(initialTender);
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
          setPipelineLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [initialTender._id]);

  const selectedVehicle = vehicles.find(v => v._id === vehicle);
  const capacityCheck = selectedVehicle
    ? canVehicleCarryLoad(selectedVehicle, tender.weight)
    : null;
  const canAccept = vehicle && capacityCheck?.ok;

  const handleRespond = async (status, notes = '') => {
    if (status === 'Accepted' && !canAccept) return;
    setLoadingAction(status);
    await onRespond(tender._id, status, vehicle, notes);
    setLoadingAction(null);
  };

  const handleRejectConfirm = async () => {
    setShowRejectModal(false);
    await handleRespond('Rejected', rejectNotes);
    setRejectNotes('');
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const origin = tender.originAddress || {};

  return (
    <>
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm border-none cursor-default"
        onClick={onClose}
      />
      <aside className="relative h-full w-full max-w-xl bg-card border-l border-app shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-app shrink-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Inbox size={15} className="text-blue-400 shrink-0" />
            <span className="font-semibold text-app text-sm">EDI 204 — Load Tender</span>
            <span className="text-xs font-mono text-muted-app truncate">{tender.tenderId}</span>
            {tender.orderId && (
              <span className="text-xs font-mono text-muted-app truncate">· {tender.orderId}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={detailLoading}
              onClick={() => { setX12ViewMode('x12'); setCopied(false); setShowX12(true); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-input border border-app hover:bg-hover transition cursor-pointer text-secondary-app hover:text-app disabled:opacity-50"
            >
              <Copy size={12} /> View X12
            </button>
            <button type="button" onClick={onClose} className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none px-1">×</button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          <EdiPipeline pipeline={pipeline} loading={pipelineLoading || detailLoading} tender={tender} />

          {detailLoading ? (
            <div className="text-sm text-muted-app py-8 text-center animate-pulse">Loading 204 details…</div>
          ) : (
          <>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div>
              <p className="text-[10px] text-muted-app">ORDER</p>
              <p className="font-mono text-sm font-semibold text-app">{dash(tender.orderId)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-app">SHIPMENT</p>
              <p className="font-mono text-sm text-app">{tender.shipmentId}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-app">ROUTE</p>
              <p className="text-sm text-app truncate">{tender.route}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLE[tender.status]}`}>{tender.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-input rounded-lg px-4 py-3">
              <p className="text-[10px] text-muted-app mb-1">PARTNER</p>
              <p className="font-semibold text-app">{tender.partner?.name}</p>
              <p className="text-xs text-muted-app font-mono mt-0.5">{tender.ediRef}</p>
            </div>
            <div className="bg-input rounded-lg px-4 py-3">
              <p className="text-[10px] text-muted-app mb-1">TENDER REF</p>
              <p className="font-semibold text-app font-mono text-sm">{tender.tenderId}</p>
              <p className="text-xs text-muted-app mt-0.5">EDI 204 inbound</p>
            </div>
          </div>

          <Section title="Carrier identity">
            <div className="grid grid-cols-3 gap-3">
              <DetailField label="Carrier ID" value={tender.carrierId} />
              <DetailField label="Carrier name" value={tender.carrierName} />
              <DetailField label="SCAC code" value={tender.carrierScac} />
            </div>
          </Section>

          <Section title="Schedule">
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Pickup date" value={fmt(tender.pickupDate)} />
              <DetailField label="Est. delivery" value={fmt(tender.deliveryDate)} />
            </div>
          </Section>

          <Section title="Origin address (warehouse)" subtitle="Customer 204 · originAddress">
            <div className="rounded-lg border border-app bg-card/40 p-3 grid grid-cols-2 gap-3">
              <DetailField label="Location name" value={origin.locationName} />
              <DetailField label="Region" value={origin.region} />
              <DetailField label="City / municipality" value={origin.city} />
              <DetailField label="ZIP code" value={origin.zipCode} />
              <DetailField label="Contact person" value={origin.contactPerson} />
              <DetailField label="Contact phone" value={origin.contactPhone} />
            </div>
          </Section>

          <Section title="Load">
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Weight" value={formatWeight(tender.weight)} />
              <DetailField label="Commodity" value={tender.commodity} />
            </div>
          </Section>

          <div className="bg-input rounded-lg px-4 py-3">
            <p className="text-[10px] text-muted-app mb-2 uppercase tracking-wide">Assign vehicle (990 response)</p>
            <VehicleDropdown value={vehicle} onChange={setVehicle} vehicles={vehicles} loadWeight={tender.weight} />
            {vehicle && capacityCheck?.ok && (
              <p className="text-[10px] text-green-400 mt-2 flex items-center gap-1">
                <CheckCircle2 size={10} /> Ready to send 990 Accepted
              </p>
            )}
            {vehicle && capacityCheck && !capacityCheck.ok && (
              <p className="text-xs text-red-400 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
                {capacityCheck.message}
              </p>
            )}
          </div>
          </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-app shrink-0 bg-card">
          {!detailLoading && tender.status === 'Pending' ? (
            <>
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={() => setShowRejectModal(true)}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition cursor-pointer font-medium disabled:opacity-50"
              >
                {loadingAction === 'Rejected'
                  ? <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                  : <XCircle size={12} />}
                {loadingAction === 'Rejected' ? 'Sending…' : 'Send 990 — Rejected'}
              </button>
              <button
                type="button"
                disabled={!canAccept || loadingAction !== null}
                onClick={() => handleRespond('Accepted')}
                className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium transition cursor-pointer border-none
                  ${canAccept && !loadingAction ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-input text-muted-app cursor-not-allowed'}`}
              >
                {loadingAction === 'Accepted'
                  ? <span className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" />
                  : <CheckCircle2 size={12} />}
                {loadingAction === 'Accepted' ? 'Sending…' : 'Send 990 — Accepted'}
              </button>
            </>
          ) : !detailLoading ? (
            <button
              type="button"
              onClick={() => { setView990Mode('x12'); setCopied990(false); setShow990(true); }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition cursor-pointer border
                ${tender.status === 'Accepted'
                  ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                  : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'}`}
            >
              <Copy size={10} /> View 990 — {tender.status}
            </button>
          ) : null}
        </div>
      </aside>
    </div>

    {/* Reject Notes Modal */}
    {showRejectModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-card border border-app rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 px-6 py-4 border-b border-app">
            <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <XCircle size={18} className="text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-app text-sm">Reject Load Tender</p>
              <p className="text-xs text-muted-app font-mono mt-0.5">{tender.tenderId}</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-3">
            <p className="text-xs text-secondary-app">Add a note explaining the reason for rejection. This will be included in the 990 response.</p>
            <textarea
              autoFocus
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              placeholder="e.g. No available vehicle for this route on the requested date..."
              rows={4}
              className="w-full bg-input border border-app rounded-lg px-3 py-2.5 text-xs text-app placeholder:text-muted-app outline-none focus:border-red-500/50 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-app">
            <button type="button" onClick={() => { setShowRejectModal(false); setRejectNotes(''); }}
              className="text-xs px-4 py-2 rounded-lg bg-hover border border-app text-secondary-app hover:opacity-80 transition cursor-pointer">
              Cancel
            </button>
            <button type="button" onClick={handleRejectConfirm}
              disabled={loadingAction !== null}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition cursor-pointer border-none disabled:opacity-50">
              {loadingAction === 'Rejected'
                ? <><span className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" /> Sending…</>
                : <><XCircle size={12} /> Confirm Reject</>}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* X12 Viewer Modal */}
    {showX12 && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-card border border-app rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-app shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">EDI 204</span>
              <span className="text-sm font-semibold text-app">{x12ViewMode === 'x12' ? 'JSON → ANSI X12' : 'Raw JSON'}</span>
              <span className="text-xs font-mono text-muted-app">{tender.tenderId}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle */}
              <div className="flex items-center bg-input border border-app rounded-lg overflow-hidden text-xs">
                <button type="button" onClick={() => setX12ViewMode('json')}
                  className={`px-3 py-1.5 transition cursor-pointer border-none ${x12ViewMode === 'json' ? 'bg-blue-600 text-white' : 'text-secondary-app hover:text-app'}`}>
                  JSON
                </button>
                <button type="button" onClick={() => setX12ViewMode('x12')}
                  className={`px-3 py-1.5 transition cursor-pointer border-none ${x12ViewMode === 'x12' ? 'bg-blue-600 text-white' : 'text-secondary-app hover:text-app'}`}>
                  ANSI X12
                </button>
              </div>
              <button type="button" onClick={copyX12}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-input border border-app hover:bg-hover transition cursor-pointer text-secondary-app hover:text-app">
                {copied
                  ? <><ClipboardCheck size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></>
                  : <><Copy size={12} /> Copy</>}
              </button>
              <button type="button" onClick={() => setShowX12(false)} className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-4">
            {x12ViewMode === 'x12' ? (
              <pre className="text-xs font-mono bg-code-block text-code-x12 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                {generateX12_204(tender)}
              </pre>
            ) : (
              <pre className="text-xs font-mono bg-code-block text-code-json rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                {tender.rawJson
                  ? JSON.stringify(tender.rawJson, null, 2)
                  : JSON.stringify({
                      isaId:        tender.partner?.isaId,
                      orderId:      tender.orderId,
                      shipmentId:   tender.shipmentId,
                      route:        tender.route,
                      weight:       tender.weight,
                      commodity:    tender.commodity,
                      carrierId:    tender.carrierId,
                      carrierScac:  tender.carrierScac,
                      pickupDate:   tender.pickupDate,
                      deliveryDate: tender.deliveryDate,
                      originAddress: tender.originAddress,
                    }, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    )}

    {/* 990 Viewer Modal */}
    {show990 && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-card border border-app rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-app shrink-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${tender.status === 'Accepted' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>EDI 990</span>
              <span className="text-sm font-semibold text-app">990 Response — {tender.status}</span>
              <span className="text-xs font-mono text-muted-app">{tender.tenderId}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-input border border-app rounded-lg overflow-hidden text-xs">
                <button type="button" onClick={() => setView990Mode('json')}
                  className={`px-3 py-1.5 transition cursor-pointer border-none ${view990Mode === 'json' ? 'bg-blue-600 text-white' : 'text-secondary-app hover:text-app'}`}>
                  JSON
                </button>
                <button type="button" onClick={() => setView990Mode('x12')}
                  className={`px-3 py-1.5 transition cursor-pointer border-none ${view990Mode === 'x12' ? 'bg-blue-600 text-white' : 'text-secondary-app hover:text-app'}`}>
                  ANSI X12
                </button>
              </div>
              <button type="button" onClick={() => {
                const text = view990Mode === 'x12' ? generateX12_990(tender) : JSON.stringify(get990Json(tender), null, 2);
                navigator.clipboard.writeText(text).then(() => { setCopied990(true); setTimeout(() => setCopied990(false), 2000); });
              }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-input border border-app hover:bg-hover transition cursor-pointer text-secondary-app hover:text-app">
                {copied990
                  ? <><ClipboardCheck size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></>
                  : <><Copy size={12} /> Copy</>}
              </button>
              <button type="button" onClick={() => setShow990(false)} className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-4">
            {view990Mode === 'x12' ? (
              <pre className="text-xs font-mono bg-code-block text-code-x12 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                {generateX12_990(tender)}
              </pre>
            ) : (
              <pre className="text-xs font-mono bg-code-block text-code-json rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                {JSON.stringify(get990Json(tender), null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function LoadTenders() {
  const [tenders, setTenders]   = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [view990Tender, setView990Tender] = useState(null);
  const [view990Mode, setView990Mode]     = useState('x12');
  const [copied990, setCopied990]         = useState(false);
  const { show: showToast, node: toastNode } = useToast();

  const load = async () => {
    try {
      const [t, v] = await Promise.all([
        api.get('/loadtenders'),
        api.get('/vehicles'),
      ]);
      setTenders(t);
      setVehicles([...v].sort((a, b) => {
        const kg = s => parseFloat(String(s || '0').replace(/[^0-9.]/g, '')) || 0;
        return kg(a.capacity) - kg(b.capacity);
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  usePolling(load);

  const handleRespond = async (id, status, vehicleId, notes = '') => {
    try {
      await api.post(`/loadtenders/${id}/respond`, { status, vehicleId, notes });
      await load();
      setSelected(null);
      showToast(
        status === 'Accepted' ? '990 Accepted — shipment created successfully.' : '990 Rejected — tender declined.',
        status === 'Accepted' ? 'success' : 'error'
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const pending  = tenders.filter(t => t.status === 'Pending').length;
  const accepted = tenders.filter(t => t.status === 'Accepted').length;
  const rejected = tenders.filter(t => t.status === 'Rejected').length;
  const fleetCount = vehicles.length;

  const filtered = filterStatus === 'All' ? tenders : tenders.filter(t => t.status === filterStatus);
  const displayed = search.trim()
    ? filtered.filter(t =>
        (t.shipmentId ?? '').toLowerCase().includes(search.trim().toLowerCase()) ||
        (t.orderId    ?? '').toLowerCase().includes(search.trim().toLowerCase())
      )
    : filtered;

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const fmtTime = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) return <div className="text-muted-app text-sm py-10 text-center">Loading...</div>;
  if (error)   return <div className="text-red-400 text-sm py-10 text-center">{error}</div>;

  return (
    <>
      <div className="bg-card rounded-xl border border-app flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-app shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Inbox size={14} className="text-secondary-app" />
            <span className="font-semibold text-sm text-app">Incoming Load Tenders (EDI 204)</span>
            {pending > 0 && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{pending} awaiting response</span>
            )}
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">{fleetCount} trucks in fleet</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search shipment / order ID..."
              className="text-xs px-3 py-1.5 rounded-lg bg-input border border-app text-app placeholder:text-muted-app focus:outline-none focus:border-blue-500 w-44 mr-2"
            />
            {[
              { label: 'All',      count: tenders.length },
              { label: 'Pending',  count: pending },
              { label: 'Accepted', count: accepted },
              { label: 'Rejected', count: rejected },
            ].map(({ label, count }) => (
              <button
                key={label}
                type="button"
                onClick={() => setFilterStatus(label)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer border
                  ${filterStatus === label
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-input text-secondary-app border-app hover:text-app hover:bg-hover'}`}
              >
                {label} <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-muted-app text-xs border-b border-app">
                <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Shipment ID / Order ID</th>
                <th className="text-left px-4 py-2.5 font-medium">Partner</th>
                <th className="text-left px-4 py-2.5 font-medium">Pickup</th>
                <th className="text-left px-4 py-2.5 font-medium">Est. delivery</th>
                <th className="text-left px-4 py-2.5 font-medium">Route</th>
                <th className="text-left px-4 py-2.5 font-medium">990</th>
                <th className="text-left px-4 py-2.5 font-medium">Received</th>
                <th className="text-right px-4 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-muted-app text-sm">No load tenders found.</td></tr>
              )}
              {displayed.map(t => (
                <tr key={t._id} className="border-b border-subtle hover:bg-hover transition">
                  <td className="px-4 py-3 font-mono text-xs text-secondary-app whitespace-nowrap">
                    <p>{t.shipmentId ?? '—'}</p>
                    {t.orderId && <p className="text-muted-app mt-0.5">{t.orderId}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-app font-medium whitespace-nowrap">{t.partner?.name}</td>
                  <td className="px-4 py-3 text-xs text-secondary-app whitespace-nowrap">{fmt(t.pickupDate)}</td>
                  <td className="px-4 py-3 text-xs text-secondary-app whitespace-nowrap">{fmt(t.deliveryDate)}</td>
                  <td className="px-4 py-3 text-xs text-secondary-app whitespace-nowrap">{t.route}</td>
                  <td className="px-4 py-3">
                    {t.status === 'Pending'
                      ? <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                      : <button
                          type="button"
                          onClick={() => { setView990Mode('x12'); setCopied990(false); setView990Tender(t); }}
                          className={`text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium transition cursor-pointer border
                            ${t.status === 'Accepted'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'}`}
                        >
                          {t.status}
                        </button>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-app whitespace-nowrap">{fmtTime(t.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(t)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer border-none whitespace-nowrap
                        ${t.status === 'Pending' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-input hover:bg-hover text-secondary-app border border-app'}`}
                    >
                      {t.status === 'Pending' ? 'Respond' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <TenderDetail
          tender={selected}
          vehicles={vehicles}
          onClose={() => setSelected(null)}
          onRespond={handleRespond}
        />
      )}

      {/* 990 Viewer from table badge */}
      {view990Tender && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-app rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-app shrink-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${view990Tender.status === 'Accepted' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>EDI 990</span>
                <span className="text-sm font-semibold text-app">990 Response — {view990Tender.status}</span>
                <span className="text-xs font-mono text-muted-app">{view990Tender.tenderId}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-input border border-app rounded-lg overflow-hidden text-xs">
                  <button type="button" onClick={() => setView990Mode('json')}
                    className={`px-3 py-1.5 transition cursor-pointer border-none ${view990Mode === 'json' ? 'bg-blue-600 text-white' : 'text-secondary-app hover:text-app'}`}>
                    JSON
                  </button>
                  <button type="button" onClick={() => setView990Mode('x12')}
                    className={`px-3 py-1.5 transition cursor-pointer border-none ${view990Mode === 'x12' ? 'bg-blue-600 text-white' : 'text-secondary-app hover:text-app'}`}>
                    ANSI X12
                  </button>
                </div>
                <button type="button" onClick={() => {
                  const text = view990Mode === 'x12' ? generateX12_990(view990Tender) : JSON.stringify(get990Json(view990Tender), null, 2);
                  navigator.clipboard.writeText(text).then(() => { setCopied990(true); setTimeout(() => setCopied990(false), 2000); });
                }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-input border border-app hover:bg-hover transition cursor-pointer text-secondary-app hover:text-app">
                  {copied990
                    ? <><ClipboardCheck size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></>
                    : <><Copy size={12} /> Copy</>}
                </button>
                <button type="button" onClick={() => setView990Tender(null)} className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {view990Mode === 'x12' ? (
                <pre className="text-xs font-mono bg-code-block text-code-x12 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                  {generateX12_990(view990Tender)}
                </pre>
              ) : (
                <pre className="text-xs font-mono bg-code-block text-code-json rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                  {JSON.stringify(get990Json(view990Tender), null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {toastNode}
    </>
  );
}

export default LoadTenders;
