// Icone lucide come SVG inline: si importa per nome solo ciò che serve (es. `import { Coffee } from 'lucide'`).
import { createElement } from 'react';
import type { IconNode } from 'lucide';

type Props = { icona: IconNode; className?: string };

export function Icona({ icona, className = 'h-5 w-5' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {icona.map(([tag, attributi], i) => createElement(tag, { ...attributi, key: i }))}
    </svg>
  );
}
