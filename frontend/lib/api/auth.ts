import { client } from "./client";

/**
 * 登录，返回 token
 */
export async function login(password: string): Promise<{ success: boolean; token?: string }> {
  const res = await client.auth.login.$post({
    json: { password },
  });

  if (!res.ok) {
    return { success: false };
  }

  const data = await res.json();
  return { success: data.success, token: data.data?.token };
}

/**
 * 登出
 */
export async function logout(): Promise<boolean> {
  const res = await client.auth.logout.$post();

  if (!res.ok) {
    return false;
  }

  const data = await res.json();
  return data.success;
}
