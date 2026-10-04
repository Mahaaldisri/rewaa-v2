/**
 * Mock image pipeline.
 * In production these builders are replaced by the CDN URLs returned from the
 * Product API (`thumbnail` / `medium` / `large` / `zoom`), so the UI keeps the
 * exact same `ProductImage` shape.
 */
import type { ProductImage } from "@/types/product";

const BASE = "https://images.pexels.com/photos";

function cdn(id: number, w: number, h: number, dpr = 1): string {
  return `${BASE}/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}&dpr=${dpr}`;
}

export type Ratio = ProductImage["ratio"];

const SIZE_MAP: Record<Ratio, [number, number]> = {
  square: [1, 1],
  portrait: [4, 5],
  landscape: [3, 2],
};

interface ImageSeed {
  id: number;
  alt: string;
  ratio?: Ratio;
  optionIds?: string[];
}

export function buildImage(seed: ImageSeed, index: number): ProductImage {
  const ratio = seed.ratio ?? "square";
  const [rw, rh] = SIZE_MAP[ratio];
  const shape = (w: number, dpr = 1) => cdn(seed.id, w, Math.round((w * rh) / rw), dpr);
  return {
    id: `img-${index + 1}`,
    alt: seed.alt,
    thumb: shape(180),
    medium: shape(800),
    large: shape(1400),
    zoom: shape(1600, 2),
    ratio,
    optionIds: seed.optionIds,
  };
}

export function buildImages(seeds: ImageSeed[]): ProductImage[] {
  return seeds.map(buildImage);
}

/** Small helper for review / related-product imagery. */
export function photo(id: number, w = 600, h = 600): string {
  return cdn(id, w, h);
}
