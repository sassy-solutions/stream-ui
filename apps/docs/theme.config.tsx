import type { DocsThemeConfig } from 'nextra-theme-docs';

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 700 }}>@stream-ui</span>,
  project: {
    link: 'https://github.com/sassy-solutions/stream-ui',
  },
  docsRepositoryBase:
    'https://github.com/sassy-solutions/stream-ui/tree/main/apps/docs',
  footer: {
    content: (
      <span>
        MIT {new Date().getFullYear()} ©{' '}
        <a href="https://github.com/sassy-solutions" target="_blank" rel="noreferrer">
          Sassy Solutions
        </a>
        . Form-first LLM streaming for React &amp; React Native.
      </span>
    ),
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta
        name="description"
        content="@stream-ui — form-first LLM streaming + parsing for React & React Native. AG-UI + A2UI native."
      />
      <meta property="og:title" content="@stream-ui" />
      <meta
        property="og:description"
        content="Form-first LLM streaming for React & React Native."
      />
    </>
  ),
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  darkMode: true,
  color: {
    hue: 200,
    saturation: 90,
  },
};

export default config;
