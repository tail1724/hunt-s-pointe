/**
 * Check/test-time stand-in for https://deno.land/std@0.168.0/http/server.ts,
 * which this environment's network policy can't fetch. Mirrors the legacy
 * `serve` signature on top of the built-in Deno.serve so functions are both
 * type-checkable and runnable locally. Resolved ONLY through
 * _check/import_map.json — Supabase deploys still fetch the real URL.
 */
export interface ConnInfo {
  readonly localAddr: Deno.Addr;
  readonly remoteAddr: Deno.Addr;
}

export type Handler = (
  request: Request,
  connInfo: ConnInfo,
) => Response | Promise<Response>;

export interface ServeInit {
  port?: number;
  hostname?: string;
  signal?: AbortSignal;
  onError?: (error: unknown) => Response | Promise<Response>;
  onListen?: (params: { hostname: string; port: number }) => void;
}

export async function serve(handler: Handler, options: ServeInit = {}): Promise<void> {
  // Deno.serve returns before any request is handled, so listenAddr is
  // always assigned by the time the handler closure reads it.
  let listenAddr: Deno.Addr | null = null;
  const server = Deno.serve(
    {
      port: options.port ?? 8000,
      hostname: options.hostname,
      signal: options.signal,
      onListen: options.onListen,
      onError: options.onError,
    },
    (request, info): Response | Promise<Response> =>
      handler(request, { localAddr: listenAddr!, remoteAddr: info.remoteAddr }),
  );
  listenAddr = server.addr;
  await server.finished;
}
