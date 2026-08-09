import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--paper) / <alpha-value>)',
        'paper-2': 'rgb(var(--paper-2) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--ink-3) / <alpha-value>)',
        rule: 'rgb(var(--rule) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'stamp-green': 'rgb(var(--stamp-green) / <alpha-value>)',
        'stamp-amber': 'rgb(var(--stamp-amber) / <alpha-value>)',
        'stamp-blue': 'rgb(var(--stamp-blue) / <alpha-value>)',
        'stamp-red': 'rgb(var(--stamp-red) / <alpha-value>)',
        'stamp-grey': 'rgb(var(--stamp-grey) / <alpha-value>)',
      },
      fontFamily: {
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
