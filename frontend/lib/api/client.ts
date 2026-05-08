import { hc } from 'hono/client'
import { API_URL } from './config'
import type { AppType } from '@functions/app'

const customFetch: typeof fetch = async (input, init) => {
  // 从 localStorage 读取 JWT token 并添加到 Authorization header
  const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;
  const headers = new Headers(init?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestInit: RequestInit = {
    ...init,
    headers,
    credentials: init?.credentials || "include",
  };

  const res = await fetch(input, requestInit)

  if (res.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      // 清除过期 token
      localStorage.removeItem("auth_token");
      const currentUrl = window.location.href;
      const redirectUrl = `/login?redirect=${encodeURIComponent(currentUrl)}`;
      window.location.href = redirectUrl;
    }
  }

  return res
}

export const client = hc<AppType>(API_URL, { fetch: customFetch }) as any
