import React, { useState, useMemo } from 'react';
import { useTheme } from '../../theme';
import {
  BIOBIZZ_PRODUCTS, BIOBIZZ_SCHEDULE, getScheduleForWeek
} from '../../constants/biobizz';
import {
  Package, Plus, Minus, ShoppingCart, Check, X,
  AlertTriangle, Droplet, RefreshCw
} from 'lucide-react';

const BOTTLE_SIZES = [
  { value: 250, label: '250ml' },
  { value: 500, label: '500ml' },
  { value: 1000, label: '1L' },
  { value: 5000, label: '5L' },
  { value: 10000, label: '10L' }
];

export default function ProductInventory({ inventory, updateProductInventory, currentWeek }) {
  const { currentTheme } = useTheme();
  const [editProduct, setEditProduct] = useState(null);

  // Produkte die diese Woche gebraucht werden
  const weekProducts = useMemo(() => {
    const schedule = getScheduleForWeek(currentWeek);
    return Object.entries(schedule.products)
      .filter(([_, ml]) => ml != null && ml > 0)
      .map(([id]) => id);
  }, [currentWeek]);

  // Einkaufsliste
  const shoppingList = useMemo(() => {
    return BIOBIZZ_PRODUCTS.filter(p => {
      const inv = inventory[p.id];
      if (!inv?.owned) return false;
      const percent = inv.bottleSize > 0 ? (inv.currentMl / inv.bottleSize) * 100 : 0;
      return percent < 20;
    });
  }, [inventory]);

  // Geschatzter Verbrauch pro Woche (bei 10L Wasser)
  const getWeeklyUsage = (productId) => {
    const remaining = 16 - currentWeek + 1;
    let totalMl = 0;
    for (let w = currentWeek; w <= 16; w++) {
      const schedule = getScheduleForWeek(w);
      const ml = schedule.products[productId];
      if (ml) totalMl += ml * 10; // 10L Standard
    }
    return { totalMl, weeksLeft: remaining, perWeek: remaining > 0 ? totalMl / remaining : 0 };
  };

  const toggleOwned = (productId) => {
    const current = inventory[productId];
    updateProductInventory(productId, {
      owned: !current?.owned,
      currentMl: !current?.owned ? (current?.bottleSize || 1000) : 0
    });
  };

  const refillProduct = (productId) => {
    const inv = inventory[productId];
    updateProductInventory(productId, {
      currentMl: inv?.bottleSize || 1000
    });
  };

  return (
    <div className="space-y-5">
      {/* Haupt-Inventar */}
      <div className="rounded-3xl border shadow-2xl backdrop-blur-sm overflow-hidden"
        style={{ backgroundColor: `${currentTheme.bg.card}95`, borderColor: 'rgba(255,255,255,0.05)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: currentTheme.border.default }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
              <Package size={18} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: currentTheme.text.primary }}>BioBizz Inventar</h3>
              <p className="text-xs" style={{ color: currentTheme.text.muted }}>
                {BIOBIZZ_PRODUCTS.filter(p => inventory[p.id]?.owned).length} von {BIOBIZZ_PRODUCTS.length} Produkten vorhanden
              </p>
            </div>
          </div>
        </div>

        {/* Produkt-Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
          {BIOBIZZ_PRODUCTS.map(product => {
            const inv = inventory[product.id] || { owned: false, bottleSize: 1000, currentMl: 0 };
            const percent = inv.bottleSize > 0 ? Math.round((inv.currentMl / inv.bottleSize) * 100) : 0;
            const isNeeded = weekProducts.includes(product.id);
            const usage = getWeeklyUsage(product.id);
            const weeksRemaining = usage.perWeek > 0 ? Math.floor(inv.currentMl / (usage.perWeek)) : Infinity;
            const isEditing = editProduct === product.id;

            return (
              <div key={product.id}
                className={`rounded-xl border overflow-hidden transition-all ${inv.owned ? '' : 'opacity-50'}`}
                style={{
                  backgroundColor: currentTheme.bg.main,
                  borderColor: isNeeded && inv.owned ? `${product.color}40` : currentTheme.border.default
                }}>

                {/* Farbiger Header */}
                <div className="h-1.5" style={{ backgroundColor: product.color, opacity: inv.owned ? 1 : 0.3 }} />

                <div className="p-3">
                  {/* Produkt-Info */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <product.icon size={14} style={{ color: product.color }} />
                      <span className="text-sm font-bold" style={{ color: inv.owned ? product.color : currentTheme.text.muted }}>
                        {product.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isNeeded && inv.owned && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-400">
                          DIESE WOCHE
                        </span>
                      )}
                      <button onClick={() => toggleOwned(product.id)}
                        className="p-1 rounded transition-colors"
                        style={{ color: inv.owned ? '#10b981' : currentTheme.text.muted }}>
                        {inv.owned ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                    </div>
                  </div>

                  {inv.owned ? (
                    <>
                      {/* NPK + Kategorie */}
                      <div className="flex items-center gap-2 mb-2">
                        {product.npk && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${product.color}10`, color: `${product.color}aa` }}>
                            NPK {product.npk}
                          </span>
                        )}
                        <span className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: currentTheme.bg.hover, color: currentTheme.text.muted }}>
                          {product.category}
                        </span>
                      </div>

                      {/* Fullstand-Balken */}
                      <div className="mb-2">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span style={{ color: currentTheme.text.muted }}>
                            {inv.currentMl}ml / {inv.bottleSize}ml
                          </span>
                          <span className="font-bold" style={{
                            color: percent > 50 ? '#10b981' : percent > 20 ? '#f59e0b' : '#ef4444'
                          }}>
                            {percent}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${product.color}15` }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, percent)}%`,
                              backgroundColor: percent > 50 ? product.color : percent > 20 ? '#f59e0b' : '#ef4444'
                            }} />
                        </div>
                      </div>

                      {/* Verbrauchsschatzung */}
                      {usage.perWeek > 0 && (
                        <div className="text-[10px] mb-2" style={{ color: currentTheme.text.muted }}>
                          ~{usage.perWeek.toFixed(0)}ml/Woche &bull;{' '}
                          {weeksRemaining === Infinity ? '∞' :
                           weeksRemaining <= 2 ? <span className="text-red-400 font-bold">{weeksRemaining} Wochen ubrig</span> :
                           `${weeksRemaining} Wochen ubrig`
                          }
                        </div>
                      )}

                      {/* Edit / Refill */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <label className="text-[10px] font-medium" style={{ color: currentTheme.text.muted }}>
                            Flaschengrosse
                          </label>
                          <div className="flex gap-1">
                            {BOTTLE_SIZES.map(bs => (
                              <button key={bs.value} onClick={() => {
                                updateProductInventory(product.id, {
                                  bottleSize: bs.value,
                                  currentMl: Math.min(inv.currentMl, bs.value)
                                });
                              }}
                                className="flex-1 py-1 rounded text-[9px] font-bold transition-all"
                                style={{
                                  backgroundColor: inv.bottleSize === bs.value ? `${product.color}20` : currentTheme.bg.hover,
                                  color: inv.bottleSize === bs.value ? product.color : currentTheme.text.muted
                                }}>
                                {bs.label}
                              </button>
                            ))}
                          </div>
                          <label className="text-[10px] font-medium" style={{ color: currentTheme.text.muted }}>
                            Aktueller Fullstand (ml)
                          </label>
                          <input type="range" min="0" max={inv.bottleSize} value={inv.currentMl}
                            onChange={e => updateProductInventory(product.id, { currentMl: parseInt(e.target.value) })}
                            className="w-full" style={{ accentColor: product.color }} />
                          <button onClick={() => setEditProduct(null)}
                            className="w-full py-1.5 rounded-lg text-[10px] font-bold"
                            style={{ backgroundColor: currentTheme.bg.hover, color: currentTheme.text.secondary }}>
                            Fertig
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button onClick={() => refillProduct(product.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                            style={{ backgroundColor: `${product.color}10`, color: product.color }}>
                            <RefreshCw size={10} /> Auffullen
                          </button>
                          <button onClick={() => setEditProduct(product.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                            style={{ backgroundColor: currentTheme.bg.hover, color: currentTheme.text.muted }}>
                            Bearbeiten
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <button onClick={() => toggleOwned(product.id)}
                        className="text-[10px] font-medium px-3 py-1.5 rounded-lg transition-all"
                        style={{ backgroundColor: `${product.color}10`, color: product.color }}>
                        <Plus size={10} className="inline mr-1" /> Hinzufugen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Einkaufsliste */}
      {shoppingList.length > 0 && (
        <div className="rounded-2xl border p-5" style={{
          background: `linear-gradient(135deg, rgba(239,68,68,0.05), rgba(245,158,11,0.05))`,
          borderColor: 'rgba(239,68,68,0.2)'
        }}>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart size={16} className="text-red-400" />
            <h4 className="text-sm font-bold" style={{ color: currentTheme.text.primary }}>Einkaufsliste</h4>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-400">
              {shoppingList.length} Produkte
            </span>
          </div>
          <div className="space-y-2">
            {shoppingList.map(product => {
              const inv = inventory[product.id];
              const percent = inv.bottleSize > 0 ? Math.round((inv.currentMl / inv.bottleSize) * 100) : 0;
              return (
                <div key={product.id} className="flex items-center justify-between p-2 rounded-lg"
                  style={{ backgroundColor: `${currentTheme.bg.card}60` }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={12} className="text-amber-400" />
                    <span className="text-xs font-medium" style={{ color: product.color }}>{product.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-red-400">
                    Nur noch {percent}% ({inv.currentMl}ml)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
