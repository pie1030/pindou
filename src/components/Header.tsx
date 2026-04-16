import { useI18n } from '../i18n';

export function Header() {
  const { t, toggle } = useI18n();
  return (
    <header className="relative px-6 py-4 flex items-center justify-between border-b-3 border-rose-quartz bg-white/70 backdrop-blur-sm">
      <div className="absolute inset-x-0 top-0 h-1 shimmer-bar" />
      <div className="flex items-center gap-3">
        <span className="star text-xl" style={{ '--dur': '2s' } as React.CSSProperties}>✦</span>
        <div>
          <h1 className="text-xl font-bold gradient-text leading-tight tracking-wide">{t.title}</h1>
          <p className="text-[10px] text-text-blue opacity-70">{t.subtitle}</p>
        </div>
        <span className="star text-sm" style={{ '--dur': '2.5s', '--delay': '0.5s' } as React.CSSProperties}>✧</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-rose-light/60 hidden sm:inline">✧ ♡ ✦</span>
        <button onClick={toggle} className="btn-pixel btn-secondary text-[10px] px-3 py-1.5">
          {t.langSwitch}
        </button>
      </div>
    </header>
  );
}
