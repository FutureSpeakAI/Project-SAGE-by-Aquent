import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    signal?: AbortSignal;
    headers?: Record<string, string>;
  }
): Promise<Response> {
  try {
    console.log(`Making ${method} request to ${url}`);
    
    const res = await fetch(url, {
      method,
      headers: {
        ...(data ? { 
          "Content-Type": "application/json", 
          "Accept": "application/json"
        } : {}),
        ...(options?.headers || {})
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      mode: "cors", // Explicitly set CORS mode
      signal: options?.signal, // Add AbortController signal support
    });
    
    console.log(`Received response with status: ${res.status}`);
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Don't log AbortError as those are expected
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error(`API request failed (${method} ${url}):`, error);
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
