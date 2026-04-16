import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const translations = {
  zh: {
    title: 'PinDou',
    subtitle: '拼豆图纸生成器',
    upload: '上传图片',
    uploadHint: '拖拽图片到这里，或点击选择',
    uploadSupport: '支持 JPG / PNG / WEBP',
    gridSize: '网格尺寸',
    gridCustom: '自定义',
    generate: '✦ 生成图纸',
    generating: '生成中...',
    editor: '编辑器',
    palette: '色板',
    stats: '用豆统计',
    totalBeads: '总豆数',
    colorCount: '颜色种类',
    export: '✦ 导出 PNG 图纸',
    exportWithCodes: '图纸标注色号',
    reset: '重置',
    tool_pointer: '选择',
    tool_paint: '画笔',
    tool_eraser: '橡皮',
    tool_eyedropper: '取色',
    zoomIn: '放大',
    zoomOut: '缩小',
    zoomFit: '适应',
    selectedColor: '当前颜色',
    noImage: '请先上传图片',
    searchColor: '搜索颜色...',
    allColors: '全部',
    cellInfo: '格子信息',
    langSwitch: 'EN',
    presets: {
      small: '29×29 小',
      medium: '50×50 中',
      large: '60×60 大',
    },
  },
  en: {
    title: 'PinDou',
    subtitle: 'Bead Pattern Generator',
    upload: 'Upload Image',
    uploadHint: 'Drag & drop an image, or click to browse',
    uploadSupport: 'Supports JPG / PNG / WEBP',
    gridSize: 'Grid Size',
    gridCustom: 'Custom',
    generate: '✦ Generate Pattern',
    generating: 'Generating...',
    editor: 'Editor',
    palette: 'Palette',
    stats: 'Bead Stats',
    totalBeads: 'Total Beads',
    colorCount: 'Colors Used',
    export: '✦ Export PNG Pattern',
    exportWithCodes: 'Show color codes',
    reset: 'Reset',
    tool_pointer: 'Select',
    tool_paint: 'Paint',
    tool_eraser: 'Eraser',
    tool_eyedropper: 'Picker',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    zoomFit: 'Fit',
    selectedColor: 'Selected',
    noImage: 'Upload an image first',
    searchColor: 'Search colors...',
    allColors: 'All',
    cellInfo: 'Cell Info',
    langSwitch: '中文',
    presets: {
      small: '29×29 S',
      medium: '50×50 M',
      large: '60×60 L',
    },
  },
} as const;

type Lang = keyof typeof translations;
type Translations = typeof translations['zh'];

interface I18nContextValue {
  t: Translations;
  lang: Lang;
  toggle: () => void;
}

const I18nContext = createContext<I18nContextValue>(null!);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh');
  const toggle = useCallback(() => setLang(l => (l === 'zh' ? 'en' : 'zh')), []);
  const t = translations[lang];
  return <I18nContext.Provider value={{ t, lang, toggle }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
