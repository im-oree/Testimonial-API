/**
 * DOC 7B §5 — Snap & grid engine.
 *
 * `snapToGrid` rounds any value to the nearest grid step. `snapBox` takes a
 * dragged/resized bounding box plus every other element's box on the canvas
 * and returns the best snapped position together with the smart guides that
 * should light up — canvas center lines and element edge/center alignments,
 * within a pixel threshold. Pure functions, unit-testable, no DOM access.
 */
import { CANVAS_SNAP } from './types';

export interface Box {
  id: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuide {
  axis: 'x' | 'y';
  position: number;
  source: 'canvas' | 'element';
}

export function snapToGrid(value: number, gridSize: number = CANVAS_SNAP): number {
  return Math.round(value / gridSize) * gridSize;
}

const THRESHOLD = 5;

/**
 * Snap box against canvas center/edges plus sibling boxes.
 * For each axis, all candidate alignments within `THRESHOLD` px are compared
 * and the closest one wins; its guide is reported to the caller so the canvas
 * can draw the blue smart-guide line while the element is being dragged.
 */
export function snapBox(box: Box, others: Box[], canvasW: number, canvasH: number): { x: number; y: number; guides: SnapGuide[] } {
  const xCandidates: Array<{ value: number; source: SnapGuide['source']; position: number }> = [];
  const yCandidates: Array<{ value: number; source: SnapGuide['source']; position: number }> = [];
  const left = box.x;
  const top = box.y;

  // Canvas centre lines (source = canvas, strongest).
  xCandidates.push({ value: canvasW / 2 - box.width / 2, source: 'canvas', position: canvasW / 2 });
  yCandidates.push({ value: canvasH / 2 - box.height / 2, source: 'canvas', position: canvasH / 2 });
  xCandidates.push({ value: 0, source: 'canvas', position: 0 });
  yCandidates.push({ value: 0, source: 'canvas', position: 0 });
  xCandidates.push({ value: canvasW - box.width, source: 'canvas', position: canvasW });
  yCandidates.push({ value: canvasH - box.height, source: 'canvas', position: canvasH });


  for (const o of others) {
    if (o.id === box.id) continue;
    const oRight = o.x + o.width;
    const oBottom = o.y + o.height;
    // X alignments: left-left, right-right, left-right, centre-centre.
    xCandidates.push({ value: o.x, source: 'element', position: o.x });
    xCandidates.push({ value: oRight - box.width, source: 'element', position: oRight });
    xCandidates.push({ value: oRight, source: 'element', position: oRight });
    xCandidates.push({ value: o.x - box.width, source: 'element', position: o.x });
    xCandidates.push({ value: o.x + o.width / 2 - box.width / 2, source: 'element', position: o.x + o.width / 2 });
    // Y alignments: top-top, bottom-bottom, top-bottom, centre-centre.
    yCandidates.push({ value: o.y, source: 'element', position: o.y });
    yCandidates.push({ value: oBottom - box.height, source: 'element', position: oBottom });
    yCandidates.push({ value: oBottom, source: 'element', position: oBottom });
    yCandidates.push({ value: o.y - box.height, source: 'element', position: o.y });
    yCandidates.push({ value: o.y + o.height / 2 - box.height / 2, source: 'element', position: o.y + o.height / 2 });
  }

  const bestX = pickClosest(xCandidates, left);
  const bestY = pickClosest(yCandidates, top);
  const guides: SnapGuide[] = [];
  if (bestX) guides.push({ axis: 'x', position: bestX.position, source: bestX.source });
  if (bestY) guides.push({ axis: 'y', position: bestY.position, source: bestY.source });
  return {
    x: bestX ? bestX.value : left,
    y: bestY ? bestY.value : top,
    guides,
  };
}

function pickClosest(candidates: Array<{ value: number; source: SnapGuide['source']; position: number }>, current: number) {
  let best: { value: number; source: SnapGuide['source']; position: number } | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.abs(c.value - current);
    if (d < bestDist || (d === bestDist && best && best.source === 'element' && c.source === 'canvas')) {
      bestDist = d;
      best = c;
    }
  }
  if (best && bestDist <= THRESHOLD) return best;
  return null;
}
