export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

export interface StructuredError {
  name: string;
  message: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  stack?: string;
}

type ErrorReporter = (error: StructuredError) => void;

let reporter: ErrorReporter | null = null;
let enabled: boolean = false;

export function initErrorReporting(dsn?: string): void {
  if (!dsn || dsn.length === 0) {
    console.log('[errorReporting] No DSN configured — error reporting disabled');
    enabled = false;
    return;
  }

  enabled = true;
  reporter = (error: StructuredError) => {
    console.error(`[${error.severity.toUpperCase()}] ${error.name}: ${error.message}`, error.context ?? '');
    if (error.stack) {
      console.error(error.stack);
    }
  };

  console.log('[errorReporting] Initialized');
}

export function captureError(
  error: unknown,
  options?: {
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
  },
): void {
  const structured: StructuredError = {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
    severity: options?.severity ?? 'error',
    context: options?.context,
    stack: error instanceof Error ? error.stack : undefined,
  };

  if (reporter && enabled) {
    reporter(structured);
  } else {
    console.error(`[${structured.severity.toUpperCase()}] ${structured.name}: ${structured.message}`);
  }
}

export function captureMessage(
  message: string,
  severity: ErrorSeverity = 'info',
  context?: Record<string, unknown>,
): void {
  const structured: StructuredError = {
    name: 'Message',
    message,
    severity,
    context,
  };

  if (reporter && enabled) {
    reporter(structured);
  } else if (severity === 'error' || severity === 'fatal') {
    console.error(`[${severity.toUpperCase()}] ${message}`);
  }
}

export function isErrorReportingEnabled(): boolean {
  return enabled;
}

export function setErrorReporter(customReporter: ErrorReporter): void {
  reporter = customReporter;
  enabled = true;
}
