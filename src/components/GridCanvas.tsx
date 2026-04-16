import { useRef, useEffect, useCallback, useState, type MouseEvent, type TouchEvent } from 'react';
import { COLOR_MAP } from '../data/beadColors';
import { getContrastColor } from '../utils/color';
import { useI18n } from '../i18n';

export type Tool = 'pointer' | 'paint' | 'eraser' | 'eyedropper';

interface Props {
  grid: string[][];
  selectedColor: string | null;
  tool: Tool;
  onCellPaint: (x: number, y: number) => void;
  onCellEyedrop: (code: string) => void;
  onToolChange: (tool: Tool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const BASE_CELL = 16;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 8;

export function GridCanvas({
  grid, selectedColor, tool, onCellPaint, onCellEyedrop, onToolChange,
  canUndo, canRedo, onUndo, onRedo,
}: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);
  const rafId = useRef(0);
  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);
  zoomRef.current = zoom;
  offsetRef.current = offset;

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const screenToCell = useCallback(
    (sx: number, sy: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const x = Math.floor((sx - rect.left - offsetRef.current.x) / (BASE_CELL * zoomRef.current));
      const y = Math.floor((sy - rect.top - offsetRef.current.y) / (BASE_CELL * zoomRef.current));
      if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
      return { x, y };
    },
    [cols, rows],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || rows === 0) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    const cz = BASE_CELL;
    const showCode = zoom >= 1.8;
    const fs = Math.max(5, cz * 0.32);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const color = COLOR_MAP.get(grid[y][x]);
        const px = x * cz, py = y * cz;
        ctx.fillStyle = color?.hex ?? '#FFF';
        ctx.fillRect(px, py, cz, cz);
        if (showCode && color) {
          ctx.fillStyle = getContrastColor(color.hex);
          ctx.font = `${fs}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(color.code, px + cz / 2, py + cz / 2);
        }
      }
    }

    ctx.strokeStyle = zoom > 1 ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.5 / zoom;
    ctx.beginPath();
    for (let y = 0; y <= rows; y++) { ctx.moveTo(0, y * cz); ctx.lineTo(cols * cz, y * cz); }
    for (let x = 0; x <= cols; x++) { ctx.moveTo(x * cz, 0); ctx.lineTo(x * cz, rows * cz); }
    ctx.stroke();

    if (hoveredCell) {
      ctx.strokeStyle = '#F7CAC9';
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(hoveredCell.x * cz + 0.5 / zoom, hoveredCell.y * cz + 0.5 / zoom, cz - 1 / zoom, cz - 1 / zoom);
    }
    ctx.restore();
  }, [grid, rows, cols, zoom, offset, hoveredCell]);

  useEffect(() => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId.current);
  }, [draw]);

  useEffect(() => {
    if (!containerRef.current || rows === 0) return;
    const r = containerRef.current.getBoundingClientRect();
    const z = Math.max(MIN_ZOOM, Math.min((r.width - 16) / (cols * BASE_CELL), (r.height - 16) / (rows * BASE_CELL), 3));
    setZoom(z);
    setOffset({ x: (r.width - cols * BASE_CELL * z) / 2, y: (r.height - rows * BASE_CELL * z) / 2 });
  }, [rows, cols]);

  const fitToView = useCallback(() => {
    if (!containerRef.current || rows === 0) return;
    const r = containerRef.current.getBoundingClientRect();
    const z = Math.max(MIN_ZOOM, Math.min((r.width - 16) / (cols * BASE_CELL), (r.height - 16) / (rows * BASE_CELL), 3));
    setZoom(z);
    setOffset({ x: (r.width - cols * BASE_CELL * z) / 2, y: (r.height - rows * BASE_CELL * z) / 2 });
  }, [rows, cols]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const cz = zoomRef.current, co = offsetRef.current;
      const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cz * f));
      setOffset({ x: mx - (mx - co.x) * (nz / cz), y: my - (my - co.y) * (nz / cz) });
      setZoom(nz);
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [rows]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); onUndo(); }
      if (mod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); onRedo(); }
      if (e.key === 'v' || e.key === 'V') onToolChange('pointer');
      if (e.key === 'b' || e.key === 'B') onToolChange('paint');
      if (e.key === 'e' || e.key === 'E') onToolChange('eraser');
      if (e.key === 'i' || e.key === 'I') onToolChange('eyedropper');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onUndo, onRedo, onToolChange]);

  const handleAction = useCallback((sx: number, sy: number) => {
    const cell = screenToCell(sx, sy);
    if (!cell) return;
    if (tool === 'pointer') return;
    if (tool === 'eyedropper') onCellEyedrop(grid[cell.y][cell.x]);
    else onCellPaint(cell.x, cell.y);
  }, [screenToCell, tool, grid, onCellPaint, onCellEyedrop]);

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true); lastPan.current = { x: e.clientX, y: e.clientY }; return;
    }
    if (tool === 'pointer' && e.button === 0) {
      setIsPanning(true); lastPan.current = { x: e.clientX, y: e.clientY }; return;
    }
    if (e.button === 0) { setIsPainting(true); handleAction(e.clientX, e.clientY); }
  }, [handleAction, tool]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      setOffset(o => ({ x: o.x + e.clientX - lastPan.current.x, y: o.y + e.clientY - lastPan.current.y }));
      lastPan.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const cell = screenToCell(e.clientX, e.clientY);
    setHoveredCell(cell);
    if (isPainting && cell) handleAction(e.clientX, e.clientY);
  }, [isPanning, isPainting, screenToCell, handleAction]);

  const onMouseUp = useCallback(() => { setIsPanning(false); setIsPainting(false); }, []);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
      setIsPanning(true);
      lastPan.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      return;
    }
    if (e.touches.length === 1) {
      if (tool === 'pointer') {
        setIsPanning(true); lastPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else {
        setIsPainting(true); handleAction(e.touches[0].clientX, e.touches[0].clientY);
      }
    }
  }, [tool, handleAction]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (lastPinchDist.current > 0) {
        const f = dist / lastPinchDist.current;
        const cz = zoomRef.current, co = offsetRef.current;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const lx = mx - rect.left, ly = my - rect.top;
          const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cz * f));
          setOffset({ x: lx - (lx - co.x) * (nz / cz), y: ly - (ly - co.y) * (nz / cz) });
          setZoom(nz);
        }
      }
      setOffset(o => ({ x: o.x + mx - lastPan.current.x, y: o.y + my - lastPan.current.y }));
      lastPan.current = { x: mx, y: my };
      lastPinchDist.current = dist;
      return;
    }
    if (isPanning && e.touches.length === 1) {
      setOffset(o => ({ x: o.x + e.touches[0].clientX - lastPan.current.x, y: o.y + e.touches[0].clientY - lastPan.current.y }));
      lastPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (isPainting && e.touches.length === 1) handleAction(e.touches[0].clientX, e.touches[0].clientY);
  }, [isPanning, isPainting, handleAction]);

  const onTouchEnd = useCallback(() => { setIsPanning(false); setIsPainting(false); lastPinchDist.current = 0; }, []);

  const hoveredColor = hoveredCell ? COLOR_MAP.get(grid[hoveredCell.y]?.[hoveredCell.x]) : null;

  const TOOLS: { id: Tool; label: string; shortcut: string }[] = [
    { id: 'pointer', label: t.tool_pointer, shortcut: 'V' },
    { id: 'paint', label: t.tool_paint, shortcut: 'B' },
    { id: 'eraser', label: t.tool_eraser, shortcut: 'E' },
    { id: 'eyedropper', label: t.tool_eyedropper, shortcut: 'I' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-rose-quartz/30 bg-white/50 flex-wrap">
        <div className="flex gap-1">
          {TOOLS.map(tt => (
            <button key={tt.id} onClick={() => onToolChange(tt.id)} title={`${tt.label} (${tt.shortcut})`}
              className={`btn-pixel text-[9px] px-2 py-1 ${tool === tt.id ? 'btn-active' : 'btn-ghost'}`}
            >{tt.label}</button>
          ))}
        </div>
        <div className="border-l-2 border-rose-quartz/20 h-5 mx-1" />
        <button onClick={onUndo} disabled={!canUndo} title="Ctrl+Z"
          className={`btn-pixel text-[9px] px-2 py-1 ${canUndo ? 'btn-ghost' : 'btn-ghost opacity-30 cursor-not-allowed'}`}
        >↩</button>
        <button onClick={onRedo} disabled={!canRedo} title="Ctrl+Shift+Z"
          className={`btn-pixel text-[9px] px-2 py-1 ${canRedo ? 'btn-ghost' : 'btn-ghost opacity-30 cursor-not-allowed'}`}
        >↪</button>
        <div className="border-l-2 border-rose-quartz/20 h-5 mx-1" />
        <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, z * 1.3))} className="btn-pixel text-[9px] px-2 py-1 btn-ghost">＋</button>
        <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, z / 1.3))} className="btn-pixel text-[9px] px-2 py-1 btn-ghost">−</button>
        <button onClick={fitToView} className="btn-pixel text-[9px] px-2 py-1 btn-ghost">{t.zoomFit}</button>
        <span className="text-[8px] text-text-blue/50 ml-auto">{Math.round(zoom * 100)}%</span>
        {hoveredColor && (
          <span className="text-[9px] flex items-center gap-1 ml-2">
            <span className="inline-block w-3 h-3 rounded-sm border border-gray-300" style={{ background: hoveredColor.hex }} />
            <span className="font-bold">{hoveredColor.code}</span>
          </span>
        )}
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white/30 touch-none" style={{ minHeight: 300 }}>
        {rows === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-rose/30">
            <span className="text-4xl mb-2 star" style={{ '--dur': '2.5s' } as React.CSSProperties}>✦</span>
            <span className="text-xs">{t.noImage}</span>
          </div>
        ) : (
          <canvas ref={canvasRef}
            className={`absolute inset-0 w-full h-full grid-container ${tool === 'pointer' ? 'tool-pointer' : ''}`}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          />
        )}
      </div>
    </div>
  );
}
