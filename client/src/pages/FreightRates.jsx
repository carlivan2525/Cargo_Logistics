import { useState, useEffect } from 'react';
import { Truck, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../api';

const EMPTY = { route: '', rateL300: '', rateExpander: '', rateTruck: '' };

function FreightRates() {
  const [rates, setRates]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({}); // { [id]: rowData }
  const [adding, setAdding]   = useState(false);
  const [newRow, setNewRow]   = useState(EMPTY);
  const [saving, setSaving]   = useState({});

  const load = () =>
    api.get('/freightrates')
      .then(setRates)
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const startEdit = (r) => setEditing(prev => ({ ...prev, [r._id]: { ...r } }));
  const cancelEdit = (id) => setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });

  const saveEdit = async (id) => {
    setSaving(p => ({ ...p, [id]: true }));
    try {
      const updated = await api.put(`/freightrates/${id}`, {
        route:        editing[id].route,
        rateL300:     Number(editing[id].rateL300),
        rateExpander: Number(editing[id].rateExpander),
        rateTruck:    Number(editing[id].rateTruck),
      });
      setRates(prev => prev.map(r => r._id === id ? updated : r));
      cancelEdit(id);
    } catch (err) { alert(err.message); }
    finally { setSaving(p => ({ ...p, [id]: false })); }
  };

  const deleteRate = async (id) => {
    if (!confirm('Delete this rate?')) return;
    await api.delete(`/freightrates/${id}`);
    setRates(prev => prev.filter(r => r._id !== id));
  };

  const saveNew = async () => {
    if (!newRow.route.trim()) return alert('Route is required.');
    setSaving(p => ({ ...p, new: true }));
    try {
      const created = await api.post('/freightrates', {
        route:        newRow.route.trim(),
        rateL300:     Number(newRow.rateL300) || 0,
        rateExpander: Number(newRow.rateExpander) || 0,
        rateTruck:    Number(newRow.rateTruck) || 0,
      });
      setRates(prev => [...prev, created]);
      setNewRow(EMPTY);
      setAdding(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(p => ({ ...p, new: false })); }
  };

  const fmt = n => `₱${Number(n || 0).toLocaleString('en-PH')}`;

  if (loading) return <div className="text-gray-500 text-sm py-10 text-center">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-app overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-app">
          <div className="flex items-center gap-2">
            <Truck size={14} className="text-blue-400" />
            <span className="font-semibold text-sm text-app">Freight Rates</span>
            <span className="text-xs text-gray-500">— per route &amp; vehicle type</span>
          </div>
          <button onClick={() => { setAdding(true); setNewRow(EMPTY); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer border-none">
            <Plus size={12} /> Add Route
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-app">
                <th className="text-left px-5 py-2.5 font-medium">Route</th>
                <th className="text-left px-5 py-2.5 font-medium">L300</th>
                <th className="text-left px-5 py-2.5 font-medium">Expander</th>
                <th className="text-left px-5 py-2.5 font-medium">Truck</th>
                <th className="text-right px-5 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Add new row */}
              {adding && (
                <tr className="border-b border-app bg-blue-500/5">
                  <td className="px-5 py-2.5">
                    <input autoFocus value={newRow.route}
                      onChange={e => setNewRow(p => ({ ...p, route: e.target.value }))}
                      placeholder="e.g. Manila - Calamba"
                      className="w-full bg-input border border-app text-xs text-gray-300 rounded-lg px-3 py-1.5 outline-none" />
                  </td>
                  {['rateL300', 'rateExpander', 'rateTruck'].map(f => (
                    <td key={f} className="px-5 py-2.5">
                      <input type="number" min="0" value={newRow[f]}
                        onChange={e => setNewRow(p => ({ ...p, [f]: e.target.value }))}
                        placeholder="0"
                        className="w-28 bg-input border border-app text-xs text-gray-300 rounded-lg px-3 py-1.5 outline-none" />
                    </td>
                  ))}
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={saveNew} disabled={saving.new}
                        className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition cursor-pointer bg-transparent border-none">
                        <Save size={11} /> {saving.new ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setAdding(false)}
                        className="text-xs text-gray-500 hover:text-gray-300 transition cursor-pointer bg-transparent border-none">
                        <X size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {rates.map(r => {
                const isEditing = !!editing[r._id];
                const row = isEditing ? editing[r._id] : r;
                return (
                  <tr key={r._id} className="border-b border-subtle hover:bg-hover transition">
                    <td className="px-5 py-3">
                      {isEditing
                        ? <input value={row.route} onChange={e => setEditing(p => ({ ...p, [r._id]: { ...p[r._id], route: e.target.value } }))}
                            className="w-full bg-input border border-app text-xs text-gray-300 rounded-lg px-3 py-1.5 outline-none" />
                        : <span className="text-sm text-app font-medium">{r.route}</span>}
                    </td>
                    {[['rateL300', 'L300'], ['rateExpander', 'Expander'], ['rateTruck', 'Truck']].map(([field]) => (
                      <td key={field} className="px-5 py-3">
                        {isEditing
                          ? <input type="number" min="0" value={row[field]}
                              onChange={e => setEditing(p => ({ ...p, [r._id]: { ...p[r._id], [field]: e.target.value } }))}
                              className="w-28 bg-input border border-app text-xs text-gray-300 rounded-lg px-3 py-1.5 outline-none" />
                          : <span className="text-xs text-gray-300">{fmt(r[field])}</span>}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {isEditing ? (<>
                          <button onClick={() => saveEdit(r._id)} disabled={saving[r._id]}
                            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition cursor-pointer bg-transparent border-none">
                            <Save size={11} /> {saving[r._id] ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => cancelEdit(r._id)}
                            className="text-xs text-gray-500 hover:text-gray-300 transition cursor-pointer bg-transparent border-none">
                            <X size={13} />
                          </button>
                        </>) : (<>
                          <button onClick={() => startEdit(r)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition cursor-pointer bg-transparent border-none">
                            Edit
                          </button>
                          <button onClick={() => deleteRate(r._id)}
                            className="text-xs text-red-400 hover:text-red-300 transition cursor-pointer bg-transparent border-none">
                            <Trash2 size={12} />
                          </button>
                        </>)}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {rates.length === 0 && !adding && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-600 text-sm">No rates yet. Click "Add Route" to start.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-app bg-input/20">
          <p className="text-[11px] text-gray-500">
            Route name must match exactly how it appears in shipments (e.g. <span className="text-gray-400">Manila - Calamba</span>).
            Invoice amount is auto-computed based on route + assigned vehicle type when shipment is marked Delivered.
          </p>
        </div>
      </div>
    </div>
  );
}

export default FreightRates;
