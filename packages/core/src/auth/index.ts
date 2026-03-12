// ============================================================
// packages/core/src/auth/index.ts
// 认证模块 - Google OAuth 2.0 + Session Cookie（无第三方 Auth 库）
// 运行环境：Cloudflare Workers Edge Runtime（Web Crypto API 兼容）
// ============================================================

// ----------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------

/** 认证用户信息（从 Session 中读取） */
export interface AuthUser {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string;
    role: "user" | "admin";
    siteId: string;
}

/** Google OAuth 用户信息（来自 Google userinfo API） */
export interface GoogleProfile {
    sub: string;          // Google 用户唯一 ID
    email: string;
    email_verified: boolean;
    name: string;
    picture: string;
    given_name?: string;
    family_name?: string;
}

/** Google Token 响应 */
export interface GoogleTokenResponse {
    access_token: string;
    token_type: string;
    scope: string;
    id_token?: string;
    expires_in?: number;
}

/** 认证结果 */
export type AuthResult =
    | { success: true; user: AuthUser }
    | { success: false; error: string };

// ----------------------------------------------------------------
// Google OAuth 2.0 工具函数
// ----------------------------------------------------------------

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

/**
 * 构建 Google OAuth 授权 URL
 * @param clientId Google Client ID
 * @param redirectUri 回调地址（需在 Google Console 注册）
 * @param state CSRF 防护随机字符串
 */
export function buildGoogleAuthUrl(
    clientId: string,
    redirectUri: string,
    state: string
): string {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        access_type: "online",
        prompt: "select_account",  // 每次都让用户选择账号
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * 用 Authorization Code 换取 Access Token
 */
export async function exchangeCodeForTokens(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
): Promise<GoogleTokenResponse> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Google token exchange failed: ${response.status} ${body}`);
    }

    return response.json() as Promise<GoogleTokenResponse>;
}

/**
 * 获取 Google 用户信息 Profile
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleProfile> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error(`Google userinfo fetch failed: ${response.status}`);
    }

    return response.json() as Promise<GoogleProfile>;
}

// ----------------------------------------------------------------
// Session Cookie 工具（HMAC-SHA256 签名，无需 JWT 库）
// ----------------------------------------------------------------

const COOKIE_NAME = "session_id";
const SESSION_DURATION_DAYS = 30;

/**
 * 生成安全的 Session ID
 */
export function generateSessionId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * 用 HMAC-SHA256 对 sessionId 签名，生成 Cookie 值
 * Cookie 格式：{sessionId}.{base64(hmac)}
 */
export async function signSessionCookie(sessionId: string, secret: string): Promise<string> {
    const key = await importHmacKey(secret);
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(sessionId)
    );
    const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return `${sessionId}.${sigBase64}`;
}

/**
 * 验证 Cookie 签名并返回 sessionId
 * 返回 null 表示签名无效或格式错误
 */
export async function verifySessionCookie(
    cookieValue: string,
    secret: string
): Promise<string | null> {
    const dotIdx = cookieValue.indexOf(".");
    if (dotIdx === -1) return null;

    const sessionId = cookieValue.slice(0, dotIdx);
    const sigBase64 = cookieValue.slice(dotIdx + 1);

    try {
        const key = await importHmacKey(secret);
        const sigBytes = Uint8Array.from(atob(sigBase64), (c) => c.charCodeAt(0));
        const valid = await crypto.subtle.verify(
            "HMAC",
            key,
            sigBytes,
            new TextEncoder().encode(sessionId)
        );
        return valid ? sessionId : null;
    } catch {
        return null;
    }
}

/** 导入 HMAC 密钥 */
async function importHmacKey(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
}

/**
 * 构建 Set-Cookie 响应头字符串
 */
export function buildSetCookieHeader(signedValue: string, maxAgeSeconds = SESSION_DURATION_DAYS * 86400): string {
    return [
        `${COOKIE_NAME}=${signedValue}`,
        `Max-Age=${maxAgeSeconds}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        // 生产环境需 Secure；本地 http 开发时不加
        // "Secure",
    ].join("; ");
}

/**
 * 构建清除 Cookie 的响应头字符串（登出使用）
 */
export function buildClearCookieHeader(): string {
    return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
}

/**
 * 从请求 Cookie 头中提取 session_id Cookie 值
 */
export function extractSessionCookie(cookieHeader: string | null): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(";")) {
        const [name, ...rest] = part.trim().split("=");
        if (name.trim() === COOKIE_NAME) return rest.join("=").trim();
    }
    return null;
}

/**
 * 生成 Session 过期时间字符串（ISO8601）
 */
export function getSessionExpiresAt(days = SESSION_DURATION_DAYS): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
}

/**
 * 生成 CSRF state 随机字符串
 */
export function generateOAuthState(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// ----------------------------------------------------------------
// 密码工具（保留，用于未来邮箱密码登录扩展）
// ----------------------------------------------------------------

/** 密码哈希（SHA-256，Edge Runtime 兼容） */
export async function hashPassword(password: string): Promise<string> {
    const data = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/** 验证密码 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return (await hashPassword(password)) === hash;
}

/** 从请求头提取 Bearer Token（给可能的 API Key 场景保留） */
export function extractBearerToken(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    return authHeader.slice(7);
}

/** 验证 Bearer Token（占位，可替换为 JWT 验证） */
export async function verifyToken(_token: string): Promise<AuthResult> {
    console.warn("[Auth] verifyToken 尚未实现");
    return { success: false, error: "认证模块尚未实现" };
}
