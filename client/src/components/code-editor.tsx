import { useEffect, useMemo, useRef, useState } from 'react';
import type { ForecastRequest } from '@deploy-forecast/shared';
import { Braces, Circle, LoaderCircle, RotateCcw, Sparkles } from 'lucide-react';
import { loadMonaco, type MonacoEditorInstance } from '@/lib/monaco-loader';

export type EditorLanguage = ForecastRequest['language'];

interface CodeEditorProps {
  code: string;
  language: EditorLanguage;
  sampleCode: string;
  onChange: (code: string) => void;
  onLanguageChange: (language: EditorLanguage) => void;
}

interface EditorActionsInput {
  sampleCode: string;
  onChange: (code: string) => void;
  onLanguageChange: (language: EditorLanguage) => void;
}

export function createEditorActions({
  sampleCode,
  onChange,
  onLanguageChange,
}: EditorActionsInput) {
  return {
    loadSample: () => onChange(sampleCode),
    reset: () => onChange(''),
    switchLanguage: (language: EditorLanguage) => onLanguageChange(language),
    updateValue: (value: string) => onChange(value),
  };
}

export function CodeEditor({
  code,
  language,
  sampleCode,
  onChange,
  onLanguageChange,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const codeRef = useRef(code);
  const languageRef = useRef(language);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const actions = useMemo(
    () => createEditorActions({ sampleCode, onChange, onLanguageChange }),
    [onChange, onLanguageChange, sampleCode],
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  codeRef.current = code;
  languageRef.current = language;

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    let changeSubscription: { dispose(): void } | undefined;

    async function mountEditor() {
      try {
        const monaco = await loadMonaco();
        if (disposed || !containerRef.current) return;

        const model = monaco.editor.createModel(codeRef.current, languageRef.current);
        const editor = monaco.editor.create(containerRef.current, {
          model,
          theme: 'deployforecast-dark',
          automaticLayout: false,
          ariaLabel: 'React source code editor',
          accessibilitySupport: 'auto',
          fontFamily: 'SFMono-Regular, Consolas, monospace',
          fontSize: 13,
          lineHeight: 22,
          lineNumbers: 'on',
          minimap: { enabled: false },
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: 'line',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: 'on',
        });

        editorRef.current = editor;
        changeSubscription = editor.onDidChangeModelContent(() => {
          onChangeRef.current(editor.getValue());
        });
        resizeObserver = new ResizeObserver(() => editor.layout());
        resizeObserver.observe(containerRef.current);
        setStatus('ready');
      } catch {
        if (!disposed) setStatus('error');
      }
    }

    void mountEditor();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      changeSubscription?.dispose();
      editorRef.current?.getModel()?.dispose();
      editorRef.current?.dispose();
      editorRef.current = null;
    };
    // Monaco mounts once; controlled value and language updates are synchronized below.
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.getValue() !== code) editor.setValue(code);
  }, [code]);

  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (!model) return;
    void loadMonaco().then((monaco) => monaco.editor.setModelLanguage(model, language));
  }, [language]);

  const characterStatus = getCharacterStatus(code.length);

  return (
    <section
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-[#08100f] shadow-glow"
      aria-labelledby="source-code-editor-label"
    >
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
            <Circle className="size-2 fill-red-400 text-red-400" />
            <Circle className="size-2 fill-amber-300 text-amber-300" />
            <Circle className="size-2 fill-primary text-primary" />
          </span>
          <Braces className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span
            id="source-code-editor-label"
            className="truncate font-mono text-xs text-muted-foreground"
          >
            UserSearch.{language === 'typescript' ? 'tsx' : 'jsx'}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <label className="sr-only" htmlFor="editor-language">
            Editor language
          </label>
          <select
            id="editor-language"
            value={language}
            onChange={(event) => actions.switchLanguage(event.target.value as EditorLanguage)}
            className="h-8 rounded-md border border-border bg-[#0b1513] px-2 text-xs text-[#c8d8d3] outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="typescript">TypeScript / TSX</option>
            <option value="javascript">JavaScript / JSX</option>
          </select>
          <EditorButton onClick={actions.loadSample} label="Load sample">
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Load sample</span>
          </EditorButton>
          <EditorButton onClick={actions.reset} label="Reset editor">
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Reset</span>
          </EditorButton>
        </div>
      </div>

      <div className="relative h-[clamp(360px,56vh,560px)] min-h-[360px] w-full min-w-0 overflow-hidden">
        <div ref={containerRef} className="absolute inset-0" />
        {status === 'loading' && <EditorLoadingFallback />}
        {status === 'error' && <EditorErrorFallback />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-[11px] sm:px-4">
        <p
          className={characterStatus.valid ? 'text-muted-foreground' : 'text-amber-200'}
          role="status"
          aria-live="polite"
        >
          {characterStatus.message}
        </p>
        <p className="font-mono text-muted-foreground">
          {code.length.toLocaleString()} / 50,000 characters
        </p>
      </div>
    </section>
  );
}

export function EditorLoadingFallback() {
  return (
    <div
      className="absolute inset-0 grid place-items-center bg-[#08100f] text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-2">
        <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
        Loading code editor…
      </span>
    </div>
  );
}

function EditorErrorFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#08100f] p-6 text-center">
      <p className="max-w-sm text-sm leading-6 text-amber-200" role="alert">
        The code editor could not load. Check your connection and refresh the page.
      </p>
    </div>
  );
}

function EditorButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {children}
    </button>
  );
}

function getCharacterStatus(length: number): { valid: boolean; message: string } {
  if (length < 20) return { valid: false, message: 'Add at least 20 characters to forecast.' };
  if (length > 50_000) return { valid: false, message: 'Code exceeds the 50,000 character limit.' };
  return { valid: true, message: 'Code length is valid for forecasting.' };
}
