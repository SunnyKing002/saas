// ============================================================
// apps/site-face-paint-ideas/worker/index.ts
// Cloudflare Worker — API layer for Face Paint Ideas site
// ============================================================

import { createRepositories } from "@saas-matrix/core";
import type { D1Database } from "@saas-matrix/core";

// Worker 环境绑定类型
export interface WorkerEnv {
    DB: D1Database;
    SITE_KEY: string;
    ENVIRONMENT: string;
    EVOLINK_API_KEY: string;  // Volcengine Bearer token (set via `wrangler secret put EVOLINK_API_KEY`)
}

// ----------------------------------------------------------------
// CORS headers
// ----------------------------------------------------------------
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
}

function errorResponse(message: string, status = 400): Response {
    return jsonResponse({ success: false, error: message }, status);
}

// ----------------------------------------------------------------
// Resolve current site from D1
// ----------------------------------------------------------------
async function resolveSite(
    request: Request,
    env: WorkerEnv,
    repos: ReturnType<typeof createRepositories>,
) {
    const url = new URL(request.url);
    const siteKey = url.searchParams.get("site") || env.SITE_KEY;
    let site = await repos.sites.getSiteByKey(siteKey);
    if (!site) {
        const domain = request.headers.get("host")?.split(":")[0] || "";
        site = await repos.sites.getSiteByDomain(domain);
    }
    return site;
}

// ----------------------------------------------------------------
// POST /api/generate — Volcengine doubao-seedream-4-5-251128 proxy
// ----------------------------------------------------------------
async function handleGenerate(request: Request, env: WorkerEnv): Promise<Response> {
    const apiKey = env.EVOLINK_API_KEY;
    if (!apiKey) return errorResponse("API key not configured", 500);

    let body: { prompt?: string; imageBase64?: string };
    try {
        body = await request.json() as { prompt?: string; imageBase64?: string };
    } catch {
        return errorResponse("Invalid JSON body", 400);
    }

    const { prompt, imageBase64 } = body;
    if (!prompt?.trim()) return errorResponse("prompt is required", 400);

    const fullPrompt = `Role: You are a world-class professional face paint artist with 20 years of experience in realistic makeup.

Core Requirements:
1. Subject Consistency: Retain the user's facial contour, features, skin tone, and hairstyle from the uploaded photo (if any).
2. Painting Authenticity: Present the texture of real face painting pigments with natural strokes and edge transitions.
3. User Request: Strictly follow: "${prompt.trim()}"
4. Professional Specifications: Patterns must fit facial anatomy; colors must be aesthetically pleasing.

Negative Constraints:
- NO painting outside face boundaries. Hair, neck, ears, background must stay clean.
- NO digital filter effects or heavy CGI look.
- The result must look like a real photo of a painted face, not an illustration.`;

    const volcBody: Record<string, unknown> = {
        model: "doubao-seedream-4-5-251128",
        prompt: fullPrompt,
        response_format: "url",
        size: "1024x1024",
        stream: false,
        watermark: false,
    };

    if (imageBase64 && typeof imageBase64 === "string") {
        volcBody.image = imageBase64;
    }

    try {
        const volcResp = await fetch(
            "https://ark.cn-beijing.volces.com/api/v3/images/generations",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(volcBody),
            },
        );

        if (!volcResp.ok) {
            const errText = await volcResp.text();
            console.error("[Volcengine Error]", volcResp.status, errText);
            return errorResponse(`Generation API error: ${volcResp.status}`, 502);
        }

        const volcData = await volcResp.json() as { data?: Array<{ url: string }> };
        if (!volcData.data?.length) {
            return errorResponse("No image returned from API", 502);
        }

        const imageUrl = volcData.data[0].url;

        // Fetch image server-side and return as base64 to avoid CORS on client
        const imgResp = await fetch(imageUrl);
        if (!imgResp.ok) {
            return jsonResponse({ success: true, imageUrl });
        }

        const arrayBuffer = await imgResp.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        const mime = imgResp.headers.get("content-type") || "image/png";

        return jsonResponse({ success: true, imageUrl: `data:${mime};base64,${base64}` });
    } catch (err) {
        console.error("[Generate Error]", err);
        return errorResponse("Failed to generate image", 500);
    }
}

// ----------------------------------------------------------------
// Worker main entry
// ----------------------------------------------------------------
export default {
    async fetch(request: Request, env: WorkerEnv): Promise<Response> {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        if (!url.pathname.startsWith("/api/")) {
            return errorResponse("Not Found", 404);
        }

        // AI generation route (no DB needed)
        if (url.pathname === "/api/generate" && request.method === "POST") {
            return handleGenerate(request, env);
        }

        // D1-backed routes
        const repos = createRepositories(env.DB);

        try {
            if (url.pathname === "/api/site") {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);
                const navLinks = await repos.navLinks.getNavLinks(site.id);
                return jsonResponse({ site, navLinks });
            }

            if (url.pathname === "/api/posts") {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);
                const posts = await repos.posts.getPosts(site.id);
                return jsonResponse({ posts });
            }

            const postMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
            if (postMatch) {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);
                const post = await repos.posts.getPostBySlug(site.id, postMatch[1]);
                if (!post) return errorResponse("Post not found", 404);
                return jsonResponse(post);
            }

            if (url.pathname === "/api/docs") {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);
                const docs = await repos.docs.getDocs(site.id);
                return jsonResponse({ docs });
            }

            const docMatch = url.pathname.match(/^\/api\/docs\/([^/]+)$/);
            if (docMatch) {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);
                const doc = await repos.docs.getDocBySlug(site.id, docMatch[1]);
                if (!doc) return errorResponse("Doc not found", 404);
                return jsonResponse(doc);
            }

            if (url.pathname === "/api/plans") {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);
                const plans = await repos.plans.getPlans(site.id);
                return jsonResponse({ plans });
            }

            if (url.pathname === "/api/sitemap") {
                const site = await resolveSite(request, env, repos);
                if (!site) return errorResponse("Site not found", 404);
                const [posts, docs] = await Promise.all([
                    repos.posts.getPosts(site.id),
                    repos.docs.getDocs(site.id),
                ]);
                const paths = [
                    { path: "/", lastmod: new Date().toISOString().split("T")[0], priority: 1.0 },
                    ...posts.map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.updated_at.split("T")[0], priority: 0.7 })),
                    ...docs.map((d) => ({ path: `/docs/${d.slug}`, lastmod: d.updated_at.split("T")[0], priority: 0.6 })),
                ];
                return jsonResponse({ site, paths });
            }

            return errorResponse("Not Found", 404);
        } catch (err) {
            console.error("[Worker Error]", err);
            const message = err instanceof Error ? err.message : "Internal Server Error";
            return errorResponse(message, 500);
        }
    },
} satisfies ExportedHandler<WorkerEnv>;
