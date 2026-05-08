import { createMiddleware } from 'hono/factory';
import { verifyJWT } from '@utils/auth';
import type { Env } from '../types/hono';
import { fail } from '@utils/response';

const PUBLIC_PATHS = [
  /^\/$/,
  /^\/auth\/login/,
  /^\/_next\//,
  /\.(ico|png|svg|jpg|jpeg|css|js|webmanifest|json|woff|woff2|ttf|eot)$/,
];

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const path = c.req.path;
  if (PUBLIC_PATHS.some(pattern => pattern.test(path))) {
    await next();
    return;
  }

  const env = c.env;

  // 1. 检查 Authorization Header（API Token 或 JWT）
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // 1a. API Token 精确匹配
    if (env.API_TOKEN && token === env.API_TOKEN) {
      await next();
      return;
    }

    // 1b. JWT Token 验证（兜底方案，绕过 Cookie 问题）
    if (env.JWT_SECRET) {
      try {
        await verifyJWT(token, env.JWT_SECRET);
        await next();
        return;
      } catch (_) {
        // JWT 验证失败，继续尝试 Cookie
      }
    }
  }

  // 2. Cookie 兜底
  const cookie = c.req.header('Cookie');
  const authCookie = cookie?.match(/(?:^|;\s*)auth=([^;]+)/)?.[1];

  if (authCookie) {
    try {
      const secret = env.JWT_SECRET;
      if (!secret) {
        return fail(c, 'Server configuration error: JWT_SECRET is required.', 500);
      }
      await verifyJWT(authCookie, secret);
      await next();
      return;
    } catch (_) {
      // Cookie JWT 验证失败
    }
  }

  return fail(c, 'Unauthorized', 401);
});
