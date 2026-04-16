import { useMemo, useState } from 'react';
import { BEAD_COLORS, COLOR_MAP, SERIES_ORDER, SERIES_META } from '../data/beadColors';
import { getUsedColors } from '../utils/color';
import { useI18n } from '../i18n';

interface Props {
  grid: string[][];
  selectedColor: string | null;
  onSelectColor: (code: string) => void;
}

export function Sidebar({ grid, selectedColor, onSelectColor }: Props) {
  const { t, lang } = useI18n();
  const [search, setSearch] = useState('');
  const [activeSeries, setActiveSeries] = useState<string | null>(null);

  const hasGrid = grid.length > 0;

  const stats = useMemo(() => {
    if (!hasGrid) return [];
    return getUsedColors(grid, COLOR_MAP);
  }, [grid, hasGrid]);

  const totalBeads = useMemo(() => stats.reduce((s, e) => s + e.count, 0), [stats]);

  const filteredColors = useMemo(() => {
    let colors = BEAD_COLORS;
    if (activeSeries) colors = colors.filter(c => c.series === activeSeries);
    if (search.trim()) {
      const q = search.toLowerCase();
      colors = colors.filter(c => c.code.toLowerCase().includes(q));
    }
    return colors;
  }, [activeSeries, search]);

  const selected = selectedColor ? COLOR_MAP.get(selectedColor) : null;

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {selected && (
        <div className="pixel-border p-2 bg-white/60 flex items-center gap-2">
          <div className="w-8 h-8 rounded pixel-border flex-shrink-0"
            style={{ background: selected.hex, borderColor: selected.hex }} />
          <div className="text-[9px] leading-tight">
            <div className="font-bold">{selected.code}</div>
            <div className="text-text-blue/70">{selected.hex}</div>
          </div>
        </div>
      )}

      <div className="pixel-border p-2 bg-white/60 flex flex-col flex-1 min-h-0">
        <p className="text-[10px] font-bold mb-1.5 flex items-center gap-1">
          <span className="star text-xs" style={{ '--dur': '3s' } as React.CSSProperties}>✦</span>
          {t.palette}
        </p>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t.searchColor}
          className="w-full px-2 py-1 text-[9px] border-2 border-rose-quartz/30 rounded bg-white/80 mb-1.5 focus:outline-none focus:border-serenity" />
        <div className="flex flex-wrap gap-0.5 mb-1.5">
          <button onClick={() => setActiveSeries(null)}
            className={`text-[8px] px-1.5 py-0.5 rounded border ${!activeSeries ? 'bg-rose-quartz/30 border-rose-quartz' : 'bg-white border-gray-200'}`}
          >{t.allColors}</button>
          {SERIES_ORDER.map(s => (
            <button key={s} onClick={() => setActiveSeries(activeSeries === s ? null : s)}
              className={`text-[8px] px-1.5 py-0.5 rounded border ${activeSeries === s ? 'bg-serenity/30 border-serenity' : 'bg-white border-gray-200'}`}
              title={SERIES_META[s]?.[lang] ?? s}
            >{s}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-6 gap-0.5">
            {filteredColors.map(color => (
              <button key={color.code} onClick={() => onSelectColor(color.code)}
                className={`w-full aspect-square rounded-sm border-2 transition-all relative group ${
                  selectedColor === color.code
                    ? 'border-text-rose ring-2 ring-rose-quartz scale-110 z-10'
                    : 'border-transparent hover:border-serenity hover:scale-105'
                }`}
                style={{ background: color.hex }}
                title={color.code}
              >
                <span className="absolute inset-0 flex items-center justify-center text-[6px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: (color.r * 0.299 + color.g * 0.587 + color.b * 0.114) > 128 ? '#333' : '#fff' }}
                >{color.code}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasGrid && (
        <div className="pixel-border-accent p-2 bg-white/60">
          <p className="text-[10px] font-bold mb-1 flex items-center gap-1">
            <span className="star text-xs" style={{ '--dur': '2.5s' } as React.CSSProperties}>✧</span>
            {t.stats}
          </p>
          <div className="flex justify-between text-[9px] mb-1.5 text-text-blue">
            <span>{t.totalBeads}: <strong>{totalBeads}</strong></span>
            <span>{t.colorCount}: <strong>{stats.length}</strong></span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {stats.slice(0, 40).map(({ color, count }) => (
              <div key={color.code}
                className="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-rose-quartz/10 rounded px-1"
                onClick={() => onSelectColor(color.code)}
              >
                <span className="w-3 h-3 rounded-sm border border-gray-300 flex-shrink-0" style={{ background: color.hex }} />
                <span className="text-[8px] font-bold w-7">{color.code}</span>
                <span className="text-[8px] text-text-blue/60 flex-1 truncate">{color.hex}</span>
                <span className="text-[8px] text-text-rose font-bold">×{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
