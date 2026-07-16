import { useEffect, useRef, useState } from 'react';
import { EditorLoadingFallback, type EditorLanguage } from '@/components/code-editor';
import { loadMonaco, type MonacoDiffEditorInstance, type MonacoModel } from '@/lib/monaco-loader';

export function MonacoDiffEditor({
  original,
  improved,
  language,
}: {
  original: string;
  improved: string;
  language: EditorLanguage;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let disposed = false;
    let editor: MonacoDiffEditorInstance | undefined;
    let originalModel: MonacoModel | undefined;
    let improvedModel: MonacoModel | undefined;
    let resizeObserver: ResizeObserver | undefined;

    void loadMonaco()
      .then((monaco) => {
        if (disposed || !containerRef.current) return;
        originalModel = monaco.editor.createModel(original, language);
        improvedModel = monaco.editor.createModel(improved, language);
        editor = monaco.editor.createDiffEditor(containerRef.current, {
          theme: 'deployforecast-dark',
          automaticLayout: false,
          ariaLabel: 'Original and improved React code comparison',
          fontFamily: 'SFMono-Regular, Consolas, monospace',
          fontSize: 13,
          lineHeight: 22,
          lineNumbers: 'on',
          minimap: { enabled: false },
          originalEditable: false,
          readOnly: true,
          renderSideBySide: true,
          scrollBeyondLastLine: false,
          useInlineViewWhenSpaceIsLimited: true,
          wordWrap: 'on',
        });
        editor.setModel({ original: originalModel, modified: improvedModel });
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
      originalModel?.dispose();
      improvedModel?.dispose();
    };
  }, [improved, language, original]);

  return (
    <div
      className="relative h-[clamp(420px,62vh,680px)] min-h-[420px] min-w-0 overflow-hidden rounded-lg border border-border bg-[#08100f]"
      aria-label="Preventive fix code comparison"
    >
      <div ref={containerRef} className="absolute inset-0 min-w-0" />
      {status === 'loading' && <EditorLoadingFallback />}
      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center" role="alert">
          <p className="max-w-sm text-sm text-amber-200">
            The code comparison could not load. Refresh and try again.
          </p>
        </div>
      )}
    </div>
  );
}
