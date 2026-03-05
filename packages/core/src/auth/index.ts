// ============================================================
// packages/core/src/auth/index.ts
// 认证模块 - 占位实现，后续可扩展 JWT / OAuth / Lucia Auth 等
// ============================================================

/**
 * TODO: 集成认证方案
 * 推荐选项：
 * 1. Lucia Auth（轻量，支持 D1）- https://lucia-auth.com
 * 2. Auth.js（支持 Edge Runtime）- https://authjs.dev
 * 3. 自行实现 JWT（适合简单场景）
 *
 * 当前提供接口定义和占位实现，方便后续替换。
 */

/** 认证用户信息（JWT payload 或 Session 数据） */
export interface AuthUser {
    id: string;
    email: string;
    role: "user" | "admin";
    siteId: string;
}

/** 认证结果 */
export type AuthResult =
    | { success: true; user: AuthUser }
    | { success: false; error: string };

/**
 * 验证请求头中的 Bearer Token（占位实现）
 * TODO: 替换为实际 JWT 验证逻辑
 */
export async function verifyToken(_token: string): Promise<AuthResult> {
    // TODO: 实现 JWT 验证，例如使用 jose 库：
    // const secret = new TextEncoder().encode(env.JWT_SECRET);
    // const { payload } = await jwtVerify(token, secret);
    // return { success: true, user: payload as AuthUser };

    console.warn("[Auth] verifyToken 尚未实现，请集成认证库");
    return { success: false, error: "认证模块尚未实现" };
}

/**
 * 从请求头提取 Bearer Token
 */
export function extractBearerToken(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    return authHeader.slice(7);
}

/**
 * 简单的密码哈希工具（使用 Web Crypto API，Edge Runtime 兼容）
 * TODO: 在用户注册时使用
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 验证密码（对比哈希）
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}
