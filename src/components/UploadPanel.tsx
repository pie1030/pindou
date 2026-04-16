import { useRef, useCallback, useState, type DragEvent } from 'react';
import { useI18n } from '../i18n';

interface Props {
  onImageLoaded: (img: HTMLImageElement) => void;
  gridWidth: number;
  gridHeight: number;
  onGridSizeChange: (w: number, h: number) => void;
  onGenerate: () => void;
  generating: boolean;
  hasImage: boolean;
}

const PRESETS = [
  { w: 29, h: 29, key: 'small' as const },
  { w: 50, h: 50, key: 'medium' as const },
  { w: 60, h: 60, key: 'large' as const },
];

export function UploadPanel({
  onImageLoaded, gridWidth, gridHeight,
  onGridSizeChange, onGenerate, generating, hasImage,
}: Props) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [customMode, setCustomMode] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    const img = new Image();
    img.onload = () => onImageLoaded(img);
    img.src = url;
  }, [onImageLoaded]);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`pixel-border p-4 text-center cursor-pointer transition-all ${
          dragging ? 'bg-rose-quartz/20 scale-[1.02]' : 'bg-white/60 hover:bg-rose-quartz/10'
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-36 mx-auto rounded-md object-contain" />
        ) : (
          <div className="py-6">
            <div className="text-2xl mb-2 text-serenity">⬆</div>
            <p className="text-xs font-bold">{t.upload}</p>
            <p className="text-[9px] text-text-blue/60 mt-1">{t.uploadHint}</p>
            <p className="text-[8px] text-lilac mt-1">{t.uploadSupport}</p>
          </div>
        )}
      </div>

      <div className="pixel-border p-3 bg-white/60">
        <p className="text-[10px] font-bold mb-2 flex items-center gap-1">
          <span className="star text-xs" style={{ '--dur': '3s' } as React.CSSProperties}>✦</span>
          {t.gridSize}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESETS.map(p => (
            <button key={p.key}
              onClick={() => { onGridSizeChange(p.w, p.h); setCustomMode(false); }}
              className={`btn-pixel text-[9px] px-2 py-1 ${
                !customMode && gridWidth === p.w && gridHeight === p.h
                  ? 'btn-active' : 'btn-ghost'
              }`}
            >{t.presets[p.key]}</button>
          ))}
          <button onClick={() => setCustomMode(true)}
            className={`btn-pixel text-[9px] px-2 py-1 ${customMode ? 'btn-active' : 'btn-ghost'}`}
          >{t.gridCustom}</button>
        </div>
        {customMode && (
          <div className="flex gap-2 items-center text-[10px]">
            <input type="number" min={10} max={100} value={gridWidth}
              onChange={e => onGridSizeChange(+e.target.value || 10, gridHeight)}
              className="w-14 px-2 py-1 border-2 border-serenity/40 rounded text-center bg-white/80 focus:outline-none focus:border-serenity" />
            <span className="text-lilac">×</span>
            <input type="number" min={10} max={100} value={gridHeight}
              onChange={e => onGridSizeChange(gridWidth, +e.target.value || 10)}
              className="w-14 px-2 py-1 border-2 border-serenity/40 rounded text-center bg-white/80 focus:outline-none focus:border-serenity" />
          </div>
        )}
      </div>

      <button onClick={onGenerate} disabled={!hasImage || generating}
        className={`btn-pixel text-sm py-3 w-full font-bold ${
          hasImage && !generating ? 'btn-primary soft-hover' : 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
        }`}
      >{generating ? t.generating : t.generate}</button>
    </div>
  );
}
