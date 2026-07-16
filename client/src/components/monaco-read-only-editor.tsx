import { useEffect, useRef, useState } from 'react';
import { EditorLoadingFallback, type EditorLanguage } from '@/components/code-editor';
import { loadMonaco, type MonacoEditorInstance, type MonacoModel } from '@/lib/monaco-loader';

export function MonacoReadOnlyEditor({
  code,
  language,
  label,
}: {
  code: string;
  language: EditorLanguage;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let disposed = false;
    let editor: MonacoEditorInstance | undefined;
    let model: MonacoModel | undefined;
    let resizeObserver: ResizeObserver | undefined;

    void loadMonaco()
      .then((monaco) => {
        if (disposed || !containerRef.current) return;
        model = monaco.editor.createModel(code, language);
        editor = monaco.editor.create(containerRef.current, {
          model,
          theme: 'deployforecast-dark',
          automaticLayout: false,
          ariaLabel: label,
          fontFamily: 'SFMono-Regular, Consolas, monospace',
          fontSize: 13,
          lineHeight: 22,
          lineNumbers: 'on',
          minimap: { enabled: false },
          padding: { top: 16, bottom: 16 },
          readOnly: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
        });
        resizeObserver = new ResizeObserver(() => editor?.layout());
        resizeObserver.observe(containerRef.current);
        setStatus('ready');
      })
      .catch(() => {
        if (!disposed) setStatus('error');
      });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      editor?.dispose();
      model?.dispose();
    };
  }, [code, label, language]);

  return (
    <div
      className="relative h-[clamp(420px,62vh,680px)] min-h-[420px] min-w-0 overflow-hidden rounded-lg border border-border bg-[#08100f]"
      aria-label={label}
    >
      <div ref={containerRef} className="absolute inset-0 min-w-0" />
      {status === 'loading' && <EditorLoadingFallback />}
      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center" role="alert">
          <p className="max-w-sm text-sm text-amber-200">
            The generated test editor could not load. Refresh and try again.
          </p>
        </div>
      )}
    </div>
  );
}
