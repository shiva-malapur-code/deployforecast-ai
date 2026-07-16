const MONACO_VERSION = '0.52.2';
const MONACO_BASE_URL = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;

export interface MonacoModel {
  dispose(): void;
}

export interface MonacoEditorInstance {
  dispose(): void;
  getModel(): MonacoModel | null;
  getValue(): string;
  layout(): void;
  onDidChangeModelContent(listener: () => void): { dispose(): void };
  setValue(value: string): void;
}

interface MonacoApi {
  editor: {
    create(element: HTMLElement, options: Record<string, unknown>): MonacoEditorInstance;
    createModel(value: string, language: string): MonacoModel;
    defineTheme(name: string, theme: Record<string, unknown>): void;
    setModelLanguage(model: MonacoModel, language: string): void;
  };
  languages: {
    typescript: {
      JsxEmit: { ReactJSX: number };
      javascriptDefaults: { setCompilerOptions(options: Record<string, unknown>): void };
      typescriptDefaults: { setCompilerOptions(options: Record<string, unknown>): void };
    };
  };
}

interface AmdRequire {
  (dependencies: string[], onLoad: () => void, onError: (error: unknown) => void): void;
  config(options: { paths: { vs: string } }): void;
}

declare global {
  interface Window {
    MonacoEnvironment?: { getWorkerUrl(): string };
    monaco?: MonacoApi;
  }
}

let monacoPromise: Promise<MonacoApi> | undefined;

export function loadMonaco(): Promise<MonacoApi> {
  if (monacoPromise) return monacoPromise;

  monacoPromise = new Promise((resolve, reject) => {
    const configure = () => {
      const amdRequire = getAmdRequire();
      if (!amdRequire) {
        reject(new Error('Monaco AMD loader was not initialized.'));
        return;
      }

      const workerSource = `self.MonacoEnvironment={baseUrl:'${MONACO_BASE_URL}/'};importScripts('${MONACO_BASE_URL}/base/worker/workerMain.js');`;
      window.MonacoEnvironment = {
        getWorkerUrl: () =>
          `data:text/javascript;charset=utf-8,${encodeURIComponent(workerSource)}`,
      };
      amdRequire.config({ paths: { vs: MONACO_BASE_URL } });
      amdRequire(
        ['vs/editor/editor.main'],
        () => {
          const monaco = window.monaco;
          if (!monaco) {
            reject(new Error('Monaco failed to initialize.'));
            return;
          }

          const compilerOptions = {
            allowJs: true,
            allowNonTsExtensions: true,
            jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
          };
          monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
          monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
          monaco.editor.defineTheme('deployforecast-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
              'editor.background': '#08100f',
              'editor.foreground': '#c8d8d3',
              'editorLineNumber.foreground': '#4f625d',
              'editorLineNumber.activeForeground': '#68f5ba',
              'editorCursor.foreground': '#68f5ba',
              'editor.selectionBackground': '#255b4866',
              'editor.lineHighlightBackground': '#ffffff05',
            },
          });
          resolve(monaco);
        },
        reject,
      );
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-monaco-loader]');
    if (existingScript) {
      if (getAmdRequire()) configure();
      else {
        existingScript.addEventListener('load', configure, { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Monaco failed to load.')),
          {
            once: true,
          },
        );
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `${MONACO_BASE_URL}/loader.js`;
    script.async = true;
    script.dataset.monacoLoader = 'true';
    script.addEventListener('load', configure, { once: true });
    script.addEventListener('error', () => reject(new Error('Monaco failed to load.')), {
      once: true,
    });
    document.head.append(script);
  });

  return monacoPromise;
}

function getAmdRequire(): AmdRequire | undefined {
  return (window as unknown as { require?: AmdRequire }).require;
}
