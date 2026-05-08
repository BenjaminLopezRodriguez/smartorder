declare module "bwip-js" {
  export interface ToSvgOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
    textxalign?: "left" | "center" | "right";
  }

  export function toSVG(opts: ToSvgOptions): string;
  const _default: { toSVG: typeof toSVG };
  export default _default;
}

