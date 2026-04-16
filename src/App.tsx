import { useState, useCallback, useRef } from 'react';
import { COLOR_MAP } from './data/beadColors';
import { pixelateImage, exportGridToPNG } from './utils/color';
import { useI18n } from './i18n';
import { Header } from './components/Header';
import { UploadPanel } from './components/UploadPanel';
import { GridCanvas, type Tool } from './components/GridCanvas';
import { Sidebar } from './components/Sidebar';
import { BackgroundParticles } from './components/Decorations';

const MAX_HISTORY = 50;

export default function App() {
  const { t } = useI18n();
  const [grid, setGrid] = useState<string[][]>([]);
  const [gridWidth, setGridWidth] = useState(50);
  const [gridHeight, setGridHeight] = useState(50);
  const [selectedColor, setSelectedColor] = useState<string | null>('F5');
  const [tool, setTool] = useState<Tool>('pointer');
  const [generating, setGenerating] = useState(false);
  const [showCodes, setShowCodes] = useState(true);
  const [hasImage, setHasImage] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Undo / redo
  const history = useRef<string[][][]>([]);
  const historyIdx = useRef(-1);

  const pushHistory = useCallback((g: string[][]) => {
    const h = history.current;
    h.splice(historyIdx.current + 1);
    h.push(g);
    if (h.length > MAX_HISTORY) h.shift();
    historyIdx.current = h.length - 1;
  }, []);

  const canUndo = historyIdx.current > 0;
  const canRedo = historyIdx.current < history.current.length - 1;

  const onUndo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    historyIdx.current--;
    setGrid(history.current[historyIdx.current]);
  }, []);

  const onRedo = useCallback(() => {
    if (historyIdx.current >= history.current.length - 1) return;
    historyIdx.current++;
    setGrid(history.current[historyIdx.current]);
  }, []);

  const onImageLoaded = useCallback((img: HTMLImageElement) => {
    imgRef.current = img;
    setHasImage(true);
  }, []);

  const onGenerate = useCallback(() => {
    if (!imgRef.current) return;
    setGenerating(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        const g = pixelateImage(imgRef.current!, gridWidth, gridHeight);
        setGrid(g);
        history.current = [g];
        historyIdx.current = 0;
        setGenerating(false);
      }, 50);
    });
  }, [gridWidth, gridHeight]);

  // Batched painting: accumulate strokes, push single undo entry on mouseup
  const pendingGrid = useRef<string[][] | null>(null);

  const onCellPaint = useCallback((x: number, y: number) => {
    const newCode = tool === 'eraser' ? 'H1' : selectedColor;
    if (!newCode) return;
    setGrid(prev => {
      if (prev[y]?.[x] === newCode) return prev;
      const next = pendingGrid.current ?? prev.map(r => [...r]);
      if (next[y][x] === newCode) return prev;
      next[y] = [...next[y]];
      next[y][x] = newCode;
      pendingGrid.current = next;
      return next;
    });
  }, [tool, selectedColor]);

  // Commit undo entry when painting stops
  const commitPaint = useCallback(() => {
    if (pendingGrid.current) {
      pushHistory(pendingGrid.current);
      pendingGrid.current = null;
    }
  }, [pushHistory]);

  const onCellEyedrop = useCallback((code: string) => {
    setSelectedColor(code);
    setTool('paint');
  }, []);

  const onExport = useCallback(() => {
    if (grid.length === 0) return;
    const url = exportGridToPNG(grid, COLOR_MAP, 28, showCodes);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pindou-${gridWidth}x${gridHeight}-${Date.now()}.png`;
    a.click();
  }, [grid, gridWidth, gridHeight, showCodes]);

  return (
    <div className="min-h-screen flex flex-col relative" onMouseUp={commitPaint} onTouchEnd={commitPaint}>
      <BackgroundParticles />
      <Header />
      <main className="flex-1 flex flex-col lg:flex-row gap-3 p-3 relative z-10 desktop-3col">
        <aside className="w-full lg:w-56 flex-shrink-0">
          <div className="panel-glass pixel-border p-3 h-full">
            <UploadPanel
              onImageLoaded={onImageLoaded}
              gridWidth={gridWidth} gridHeight={gridHeight}
              onGridSizeChange={(w, h) => {
                setGridWidth(Math.max(10, Math.min(100, w)));
                setGridHeight(Math.max(10, Math.min(100, h)));
              }}
              onGenerate={onGenerate}
              generating={generating}
              hasImage={hasImage}
            />
            {grid.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-[9px] cursor-pointer text-text-blue">
                  <input type="checkbox" checked={showCodes} onChange={e => setShowCodes(e.target.checked)}
                    className="accent-rose-quartz" />
                  {t.exportWithCodes}
                </label>
                <button onClick={onExport} className="btn-pixel btn-secondary text-[10px] py-2 w-full font-bold soft-hover">
                  {t.export}
                </button>
              </div>
            )}
          </div>
        </aside>

        <section className="flex-1 panel-glass pixel-border overflow-hidden flex flex-col min-h-[400px]">
          <GridCanvas
            grid={grid}
            selectedColor={selectedColor}
            tool={tool}
            onCellPaint={onCellPaint}
            onCellEyedrop={onCellEyedrop}
            onToolChange={setTool}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
          />
        </section>

        <aside className="w-full lg:w-56 flex-shrink-0">
          <div className="panel-glass pixel-border-accent p-3 h-full max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
            <Sidebar grid={grid} selectedColor={selectedColor} onSelectColor={setSelectedColor} />
          </div>
        </aside>
      </main>
      <div className="h-1 shimmer-bar" />
    </div>
  );
}
