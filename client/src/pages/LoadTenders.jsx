import { useState, useEffect } from 'react';
import { Inbox, Truck, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, Copy, ClipboardCheck } from 'lucide-react';
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
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-app mt-0.5 break-words">{dash(value)}</p>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-input rounded-lg px-4 py-3 space-y-3">
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
        {subtitle && <p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p>}
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
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-hover border border-app text-gray-300 hover:bg-white/15 transition cursor-pointer min-w-[180px] justify-between"
      >
        <span className="flex items-center gap-1.5">
          {selected?.image
            ? <img src={selected.image} alt={selected.name} className="w-5 h-5 object-contain rounded" />
            : <Truck size={11} className="text-gray-500" />}
          {selected ? `${selected.name} · ${selected.plate}` : 'Assign vehicle...'}
        </span>
        <span className="text-[10px] text-gray-500">▾</span>
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
  if (tender.status === 'Accepted' && tender.assignedVehicle) {
    base.assignedVehicle = {
      vehicleId: tender.assignedVehicle.vehicleId || '',
      name:      tender.assignedVehicle.name      || '',
      type:      tender.assignedVehicle.type      || '',
      plate:     tender.assignedVehicle.plate     || '',
    };
  }
  if (tender.status === 'Rejected' && tender.rejectNotes) {
    base.notes = tender.rejectNotes;
  }
  return base;
}

function generateX12_990(tender) {
  const pad     = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
  const today   = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const time    = new Date().toTimeString().slice(0,5).replace(':','');
  const isaId   = (tender.partner?.isaId ?? 'PARTNER').toUpperCase();
  const ctrlNum = (tender.ediRef ?? 'TRX-000001').replace('TRX-','').padStart(9,'0');
  const accepted = tender.status === 'Accepted';
  const v = tender.assignedVehicle;

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
    accepted ? `AMT*SF*60` : null,
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
  const [detailLoading, setDetailLoading] = useState(true);
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
        const fresh = await api.get(`/loadtenders/${initialTender._id}`);
        if (!cancelled) {
          setTender(fresh);
          setVehicle(fresh.assignedVehicle?._id ?? null);
        }
      } catch {
        if (!cancelled) setTender(initialTender);
      } finally {
        if (!cancelled) setDetailLoading(false);
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

  if (detailLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-card border border-app rounded-2xl px-8 py-6 text-sm text-gray-400">Loading 204 details…</div>
      </div>
    );
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-app rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-app shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Inbox size={15} className="text-blue-400" />
            <span className="font-semibold text-app text-sm">EDI 204 — Load Tender</span>
            <span className="text-xs font-mono text-gray-500">{tender.tenderId}</span>
            {tender.orderId && (
              <span className="text-xs font-mono text-gray-500">· {tender.orderId}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setX12ViewMode('x12'); setCopied(false); setShowX12(true); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-input border border-app hover:bg-hover transition cursor-pointer text-gray-400 hover:text-app"
            >
              <Copy size={12} /> View X12
            </button>
            <button type="button" onClick={onClose} className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div>
              <p className="text-[10px] text-gray-500">ORDER</p>
              <p className="font-mono text-sm font-semibold text-app">{dash(tender.orderId)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">SHIPMENT</p>
              <p className="font-mono text-sm text-app">{tender.shipmentId}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-500">ROUTE</p>
              <p className="text-sm text-app truncate">{tender.route}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLE[tender.status]}`}>{tender.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-input rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 mb-1">PARTNER</p>
              <p className="font-semibold text-app">{tender.partner?.name}</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{tender.ediRef}</p>
            </div>
            <div className="bg-input rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 mb-1">TENDER REF</p>
              <p className="font-semibold text-app font-mono text-sm">{tender.tenderId}</p>
              <p className="text-xs text-gray-500 mt-0.5">EDI 204 inbound</p>
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
            <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wide">Assign vehicle (990 response)</p>
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
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-app shrink-0">
          {tender.status === 'Pending' ? (
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
                  ${canAccept && !loadingAction ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-input text-gray-600 cursor-not-allowed'}`}
              >
                {loadingAction === 'Accepted'
                  ? <span className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" />
                  : <CheckCircle2 size={12} />}
                {loadingAction === 'Accepted' ? 'Sending…' : 'Send 990 — Accepted'}
              </button>
            </>
          ) : (
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
          )}
        </div>
      </div>
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
              <p className="text-xs text-gray-500 font-mono mt-0.5">{tender.tenderId}</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-3">
            <p className="text-xs text-gray-400">Add a note explaining the reason for rejection. This will be included in the 990 response.</p>
            <textarea
              autoFocus
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              placeholder="e.g. No available vehicle for this route on the requested date..."
              rows={4}
              className="w-full bg-input border border-app rounded-lg px-3 py-2.5 text-xs text-app placeholder-gray-600 outline-none focus:border-red-500/50 resize-none"
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
              <span className="text-xs font-mono text-gray-500">{tender.tenderId}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle */}
              <div className="flex items-center bg-input border border-app rounded-lg overflow-hidden text-xs">
                <button type="button" onClick={() => setX12ViewMode('json')}
                  className={`px-3 py-1.5 transition cursor-pointer border-none ${x12ViewMode === 'json' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-app'}`}>
                  JSON
                </button>
                <button type="button" onClick={() => setX12ViewMode('x12')}
                  className={`px-3 py-1.5 transition cursor-pointer border-none ${x12ViewMode === 'x12' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-app'}`}>
                  ANSI X12
                </button>
              </div>
              <button type="button" onClick={copyX12}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-input border border-app hover:bg-hover transition cursor-pointer text-gray-400 hover:text-app">
                {copied
                  ? <><ClipboardCheck size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></>
                  : <><Copy size={12} /> Copy</>}
              </button>
              <button type="button" onClick={() => setShowX12(false)} className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-4">
            {x12ViewMode === 'x12' ? (
              <pre className="text-xs text-green-400 font-mono bg-black/40 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                {generateX12_204(tender)}
              </pre>
            ) : (
              <pre className="text-xs text-yellow-300 font-mono bg-black/40 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
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
              <span className="text-xs font-mono text-gray-500">{tender.tenderId}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-input border border-app rounded-lg overflow-hidden text-xs">
                <button type="button" onClick={() => setView990Mode('json')}
                  className={`px-3 py-1.5 transition cursor-pointer border-none ${view990Mode === 'json' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-app'}`}>
                  JSON
                </button>
                <button type="button" onClick={() => setView990Mode('x12')}
                  className={`px-3 py-1.5 transition cursor-pointer border-none ${view990Mode === 'x12' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-app'}`}>
                  ANSI X12
                </button>
              </div>
              <button type="button" onClick={() => {
                const text = view990Mode === 'x12' ? generateX12_990(tender) : JSON.stringify(get990Json(tender), null, 2);
                navigator.clipboard.writeText(text).then(() => { setCopied990(true); setTimeout(() => setCopied990(false), 2000); });
              }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-input border border-app hover:bg-hover transition cursor-pointer text-gray-400 hover:text-app">
                {copied990
                  ? <><ClipboardCheck size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></>
                  : <><Copy size={12} /> Copy</>}
              </button>
              <button type="button" onClick={() => setShow990(false)} className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-4">
            {view990Mode === 'x12' ? (
              <pre className="text-xs text-green-400 font-mono bg-black/40 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                {generateX12_990(tender)}
              </pre>
            ) : (
              <pre className="text-xs text-yellow-300 font-mono bg-black/40 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
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

  if (loading) return <div className="text-gray-500 text-sm py-10 text-center">Loading...</div>;
  if (error)   return <div className="text-red-400 text-sm py-10 text-center">{error}</div>;

  return (
    <>
      <div className="bg-card rounded-xl border border-app flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-app shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Inbox size={14} className="text-gray-400" />
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
              className="text-xs px-3 py-1.5 rounded-lg bg-input border border-app text-app placeholder-gray-600 focus:outline-none focus:border-blue-500 w-44 mr-2"
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
                    : 'bg-input text-gray-400 border-app hover:text-app hover:bg-hover'}`}
              >
                {label} <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-gray-500 text-xs border-b border-app">
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
                <tr><td colSpan={8} className="text-center py-10 text-gray-600 text-sm">No load tenders found.</td></tr>
              )}
              {displayed.map(t => (
                <tr key={t._id} className="border-b border-subtle hover:bg-hover transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">
                    <p>{t.shipmentId ?? '—'}</p>
                    {t.orderId && <p className="text-gray-600 mt-0.5">{t.orderId}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-app font-medium whitespace-nowrap">{t.partner?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmt(t.pickupDate)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmt(t.deliveryDate)}</td>
                  <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">{t.route}</td>
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
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtTime(t.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(t)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer border-none whitespace-nowrap
                        ${t.status === 'Pending' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-input hover:bg-white/10 text-gray-400 border border-app'}`}
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
                <span className="text-xs font-mono text-gray-500">{view990Tender.tenderId}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-input border border-app rounded-lg overflow-hidden text-xs">
                  <button type="button" onClick={() => setView990Mode('json')}
                    className={`px-3 py-1.5 transition cursor-pointer border-none ${view990Mode === 'json' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-app'}`}>
                    JSON
                  </button>
                  <button type="button" onClick={() => setView990Mode('x12')}
                    className={`px-3 py-1.5 transition cursor-pointer border-none ${view990Mode === 'x12' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-app'}`}>
                    ANSI X12
                  </button>
                </div>
                <button type="button" onClick={() => {
                  const text = view990Mode === 'x12' ? generateX12_990(view990Tender) : JSON.stringify(get990Json(view990Tender), null, 2);
                  navigator.clipboard.writeText(text).then(() => { setCopied990(true); setTimeout(() => setCopied990(false), 2000); });
                }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-input border border-app hover:bg-hover transition cursor-pointer text-gray-400 hover:text-app">
                  {copied990
                    ? <><ClipboardCheck size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></>
                    : <><Copy size={12} /> Copy</>}
                </button>
                <button type="button" onClick={() => setView990Tender(null)} className="text-muted-app hover:text-app transition cursor-pointer bg-transparent border-none text-lg leading-none">×</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {view990Mode === 'x12' ? (
                <pre className="text-xs text-green-400 font-mono bg-black/40 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
                  {generateX12_990(view990Tender)}
                </pre>
              ) : (
                <pre className="text-xs text-yellow-300 font-mono bg-black/40 rounded-xl p-4 whitespace-pre overflow-x-auto leading-relaxed text-left">
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
