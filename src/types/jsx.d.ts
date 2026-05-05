import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "stats-radar": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          stats?: string;
          max?: string | number;
          theme?: string;
          axes?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
