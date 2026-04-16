import { BEAD_COLORS, type BeadColor } from '../data/beadColors';

/**
 * CIEDE2000 perceptual color difference.
 * Sharma, Wu, Dalal (2005).
 */
export function ciede2000(
  L1: number, a1: number, b1: number,
  L2: number, a2: number, b2: number,
): number {
  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab = (C1 + C2) / 2;
  const Cab7 = Cab ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cab7 / (Cab7 + 6103515625)));

  const ap1 = a1 * (1 + G);
  const ap2 = a2 * (1 + G);
  const Cp1 = Math.sqrt(ap1 * ap1 + b1 * b1);
  const Cp2 = Math.sqrt(ap2 * ap2 + b2 * b2);

  let hp1 = Math.atan2(b1, ap1) * DEG; if (hp1 < 0) hp1 += 360;
  let hp2 = Math.atan2(b2, ap2) * DEG; if (hp2 < 0) hp2 += 360;

  const dL = L2 - L1;
  const dCp = Cp2 - Cp1;
  let dhp: number;
  if (Cp1 * Cp2 === 0) dhp = 0;
  else if (Math.abs(hp2 - hp1) <= 180) dhp = hp2 - hp1;
  else if (hp2 - hp1 > 180) dhp = hp2 - hp1 - 360;
  else dhp = hp2 - hp1 + 360;
  const dHp = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dhp / 2) * RAD);

  const Lp = (L1 + L2) / 2;
  const Cp = (Cp1 + Cp2) / 2;
  let hp: number;
  if (Cp1 * Cp2 === 0) hp = hp1 + hp2;
  else if (Math.abs(hp1 - hp2) <= 180) hp = (hp1 + hp2) / 2;
  else if (hp1 + hp2 < 360) hp = (hp1 + hp2 + 360) / 2;
  else hp = (hp1 + hp2 - 360) / 2;

  const T = 1
    - 0.17 * Math.cos((hp - 30) * RAD)
    + 0.24 * Math.cos(2 * hp * RAD)
    + 0.32 * Math.cos((3 * hp + 6) * RAD)
    - 0.20 * Math.cos((4 * hp - 63) * RAD);

  const Lp50sq = (Lp - 50) ** 2;
  const SL = 1 + 0.015 * Lp50sq / Math.sqrt(20 + Lp50sq);
  const SC = 1 + 0.045 * Cp;
  const SH = 1 + 0.015 * Cp * T;

  const Cp7 = Cp ** 7;
  const RC = 2 * Math.sqrt(Cp7 / (Cp7 + 6103515625));
  const dtheta = 30 * Math.exp(-(((hp - 275) / 25) ** 2));
  const RT = -Math.sin(2 * dtheta * RAD) * RC;

  return Math.sqrt(
    (dL / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH),
  );
}

function rgbToLab(r: number, g: number, b: number) {
  const f = (c: number) => {
    const s = c / 255;
    return s > 0.04045 ? ((s + 0.055) / 1.055) ** 2.4 : s / 12.92;
  };
  const rl = f(r), gl = f(g), bl = f(b);
  const e = 216 / 24389, k = 24389 / 27;
  const lf = (t: number) => t > e ? Math.cbrt(t) : (k * t + 16) / 116;
  const x = lf((rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047);
  const y = lf(rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750);
  const z = lf((rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883);
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

export function findClosestBead(r: number, g: number, b: number): BeadColor {
  const lab = rgbToLab(r, g, b);
  let best = BEAD_COLORS[0];
  let bestDist = Infinity;
  for (const color of BEAD_COLORS) {
    const dist = ciede2000(lab.L, lab.a, lab.b, color.L, color.a, color.B);
    if (dist < bestDist) { bestDist = dist; best = color; }
  }
  return best;
}

export function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#3A3A40' : '#FFFFFF';
}

export function pixelateImage(
  img: HTMLImageElement, gridW: number, gridH: number,
): string[][] {
  const canvas = document.createElement('canvas');
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, gridW, gridH);
  const data = ctx.getImageData(0, 0, gridW, gridH).data;
  const grid: string[][] = [];
  for (let y = 0; y < gridH; y++) {
    const row: string[] = [];
    for (let x = 0; x < gridW; x++) {
      const i = (y * gridW + x) * 4;
      if (data[i + 3] < 128) row.push('H1');
      else row.push(findClosestBead(data[i], data[i + 1], data[i + 2]).code);
    }
    grid.push(row);
  }
  return grid;
}

export function exportGridToPNG(
  grid: string[][], colorMap: Map<string, BeadColor>,
  cellSize = 28, showCodes = true,
): string {
  const rows = grid.length, cols = grid[0]?.length ?? 0;
  const pad = 40, header = 50;
  const used = getUsedColors(grid, colorMap);
  const legCols = Math.floor((cols * cellSize) / 120) || 1;
  const legH = Math.ceil(used.length / legCols) * 22 + 40;
  const W = cols * cellSize + pad * 2;
  const H = header + rows * cellSize + legH + pad * 2;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#F7F6F3'; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#3A3A40';
  ctx.font = 'bold 16px "Silkscreen", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PinDou ✦ Bead Pattern', W / 2, pad + 20);
  ctx.font = '11px monospace';
  ctx.fillStyle = '#7B8B96';
  ctx.fillText(`${cols}×${rows}`, W / 2, pad + 38);

  const ox = pad, oy = pad + header;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const color = colorMap.get(grid[y][x]);
      if (!color) continue;
      ctx.fillStyle = color.hex;
      ctx.fillRect(ox + x * cellSize, oy + y * cellSize, cellSize, cellSize);
      ctx.strokeStyle = '#D5D2CC';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(ox + x * cellSize, oy + y * cellSize, cellSize, cellSize);
      if (showCodes && cellSize >= 16) {
        ctx.fillStyle = getContrastColor(color.hex);
        ctx.font = `${Math.max(6, Math.min(10, cellSize * 0.35))}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(color.code, ox + x * cellSize + cellSize / 2, oy + y * cellSize + cellSize / 2);
      }
    }
  }

  // Legend
  const ly = oy + rows * cellSize + 20;
  ctx.fillStyle = '#3A3A40'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
  ctx.fillText('Color Legend:', ox, ly);
  const itemW = (cols * cellSize) / legCols;
  used.forEach(({ color, count }, i) => {
    const col = i % legCols, row = Math.floor(i / legCols);
    const ix = ox + col * itemW, iy = ly + 14 + row * 22;
    ctx.fillStyle = color.hex;
    ctx.fillRect(ix, iy, 14, 14);
    ctx.strokeStyle = '#AAA'; ctx.lineWidth = 0.5; ctx.strokeRect(ix, iy, 14, 14);
    ctx.fillStyle = '#3A3A40'; ctx.font = '10px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${color.code} ×${count}`, ix + 18, iy + 7);
  });

  return canvas.toDataURL('image/png');
}

export function getUsedColors(grid: string[][], colorMap: Map<string, BeadColor>) {
  const counts = new Map<string, number>();
  for (const row of grid) for (const code of row) counts.set(code, (counts.get(code) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([code, count]) => ({ color: colorMap.get(code)!, count }))
    .filter(e => e.color)
    .sort((a, b) => b.count - a.count);
}
