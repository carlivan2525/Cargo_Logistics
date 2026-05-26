import { X, Truck, CheckCircle2 } from 'lucide-react';
import { canVehicleCarryLoad } from '../utils/capacity';
import { api } from '../api';

const VEHICLE_TYPE_STYLE = {
  'L300':             'bg-blue-500/20 text-blue-400',
  'Truck':            'bg-orange-500/20 text-orange-400',
  'Expander':         'bg-purple-500/20 text-purple-400',
  'Motorcycle':       'bg-green-500/20 text-green-400',
  'Sedan':            'bg-cyan-500/20 text-cyan-400',
  'SUV':              'bg-indigo-500/20 text-indigo-400',
  'Closed Van':       'bg-yellow-500/20 text-yellow-400',
  'Elf Truck':        'bg-orange-500/20 text-orange-400',
  'Wing Van':         'bg-pink-500/20 text-pink-400',
  '6-Wheeler Truck':  'bg-red-500/20 text-red-400',
  '10-Wheeler Truck': 'bg-rose-500/20 text-rose-400',
};

const STATUS_DOT = {
  'Available':   'bg-green-400',
  'In Use':      'bg-yellow-400',
  'Maintenance': 'bg-red-400',
};

export default function VehiclePickerModal({ vehicles, selected, loadWeight, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-app rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-app shrink-0">
          <div className="flex items-center gap-2">
            <Truck size={15} className="text-blue-400" />
            <span className="font-semibold text-sm text-app">Select Vehicle</span>
            {loadWeight && <span className="text-xs text-gray-500">· Load: {loadWeight}</span>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-app bg-transparent border-none cursor-pointer p-1">
            <X size={16} />
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1 p-4">
          {vehicles.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-10">No vehicles in fleet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {vehicles.map(v => {
                const check = canVehicleCarryLoad(v, loadWeight);
                const isSelected = selected === v._id;

                return (
                  <button
                    key={v._id}
                    type="button"
                    disabled={!check.ok}
                    onClick={() => { if (check.ok) { onSelect(v._id); onClose(); } }}
                    className={`relative flex flex-col rounded-xl border text-left transition cursor-pointer overflow-hidden
                      ${isSelected ? 'border-blue-500 bg-blue-500/10' : check.ok ? 'border-app bg-input hover:border-blue-500/50 hover:bg-hover' : 'border-app bg-input opacity-50 cursor-not-allowed'}
                    `}
                  >
                    {/* Vehicle image */}
                    <div className="w-full h-28 bg-black/30 flex items-center justify-center overflow-hidden">
                      {v.image ? (
                        <img src={api.imageUrl(v.image)} alt={v.name} className="w-full h-full object-contain p-2" />
                      ) : (
                        <Truck size={36} className="text-gray-700" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="px-3 py-2.5 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${VEHICLE_TYPE_STYLE[v.type] ?? 'bg-gray-500/20 text-gray-400'}`}>
                          {v.type}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[v.status] ?? 'bg-gray-500'}`} />
                          {v.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-app truncate">{v.name}</p>
                      <p className="text-[10px] text-gray-500">{v.plate} · {v.capacity}</p>
                      {!check.ok && (
                        <p className="text-[10px] text-red-400 leading-tight">{check.message}</p>
                      )}
                    </div>

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 size={16} className="text-blue-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
