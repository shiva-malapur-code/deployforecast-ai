import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CodeEditor, createEditorActions } from '../src/components/code-editor';

const sampleCode = 'export default function Sample() { return <main>Sample</main>; }';

test('loads the existing sample through the controlled onChange handler', () => {
  const values: string[] = [];
  const actions = createEditorActions({
    sampleCode,
    onChange: (value) => values.push(value),
    onLanguageChange: () => undefined,
  });

  actions.loadSample();

  assert.deepEqual(values, [sampleCode]);
});

test('reset clears the controlled value through the existing handler', () => {
  const values: string[] = [];
  const actions = createEditorActions({
    sampleCode,
    onChange: (value) => values.push(value),
    onLanguageChange: () => undefined,
  });

  actions.reset();

  assert.deepEqual(values, ['']);
});

test('language switching supports TypeScript/TSX and JavaScript/JSX', () => {
  const languages: string[] = [];
  const actions = createEditorActions({
    sampleCode,
    onChange: () => undefined,
    onLanguageChange: (language) => languages.push(language),
  });

  actions.switchLanguage('javascript');
  actions.switchLanguage('typescript');

  assert.deepEqual(languages, ['javascript', 'typescript']);
});

test('editor updates flow through the controlled onChange handler', () => {
  const values: string[] = [];
  const actions = createEditorActions({
    sampleCode,
    onChange: (value) => values.push(value),
    onLanguageChange: () => undefined,
  });

  actions.updateValue('const nextValue = <section />;');

  assert.deepEqual(values, ['const nextValue = <section />;']);
});

test('renders an accessible loading fallback before Monaco is ready', () => {
  const markup = renderToStaticMarkup(
    <CodeEditor
      code={sampleCode}
      language="typescript"
      sampleCode={sampleCode}
      onChange={() => undefined}
      onLanguageChange={() => undefined}
    />,
  );

  assert.match(markup, /Loading code editor/);
  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-labelledby="source-code-editor-label"/);
  assert.match(markup, /TypeScript \/ TSX/);
  assert.match(markup, /Load sample/);
  assert.match(markup, /Reset editor/);
});

test('keeps source-length validation visible at both invalid boundaries', () => {
  const renderEditor = (code: string) =>
    renderToStaticMarkup(
      <CodeEditor
        code={code}
        language="typescript"
        sampleCode={sampleCode}
        onChange={() => undefined}
        onLanguageChange={() => undefined}
      />,
    );

  assert.match(renderEditor('short'), /Add at least 20 characters/);
  assert.match(renderEditor('x'.repeat(50_001)), /Code exceeds the 50,000 character limit/);
  assert.match(renderEditor(sampleCode), /Code length is valid for forecasting/);
});
