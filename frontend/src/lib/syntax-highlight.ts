import type { HighlighterCore } from 'shiki/core';

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('shiki/langs/json.mjs'),
      import('shiki/themes/github-light.mjs'),
      import('shiki/themes/github-dark.mjs'),
    ]).then(([core, engine, json, githubLight, githubDark]) =>
      core.createHighlighterCore({
        langs: [json.default],
        themes: [githubLight.default, githubDark.default],
        engine: engine.createJavaScriptRegexEngine(),
      }),
    );
  }
  return highlighterPromise;
}

export async function highlightJson(
  code: string,
  theme: 'light' | 'dark',
): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang: 'json',
    theme: theme === 'dark' ? 'github-dark' : 'github-light',
  });
}
