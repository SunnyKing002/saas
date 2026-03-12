// packages/core/src/payment/creem.ts
// Creem 支付 API 封装（Edge Runtime 兼容，不依赖 Node.js crypto）
// ============================================================

export interface CreemCheckoutParams {
    productId: string;      // Creem Product ID
    successUrl: string;     // 支付成功后重定向 URL
    customerEmail?: string; // 预填客户邮箱
    metadata?: Record<string, string>; // 透传数据（userId、planId 等）
}

export interface CreemCheckoutResult {
    checkoutId: string;
    checkoutUrl: string;    // 重定向到此 URL 完成支付
}

export interface CreemWebhookEvent {
    eventType: string;      // checkout.completed / subscription.active 等
    object?: {
        id?: string;                         // checkout/subscription ID
        customerId?: string;                  // Creem Customer ID
        subscriptionId?: string;
        productId?: string;
        status?: string;
        currentPeriodStart?: string;
        currentPeriodEnd?: string;
        metadata?: Record<string, string>;   // 透传的 userId/planId 等
        customer?: { email?: string };
    };
}

// ----------------------------------------------------------------
// Creem REST API 基础请求
// ----------------------------------------------------------------

async function creemRequest<T>(
    path: string,
    apiKey: string,
    method: "GET" | "POST" = "GET",
    body?: unknown,
    useTestMode = false
): Promise<T> {
    const baseUrl = useTestMode ? "https://test-api.creem.io/v1" : "https://api.creem.io/v1";
    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Creem API error ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
}

// ----------------------------------------------------------------
// 创建 Checkout Session
// ----------------------------------------------------------------

export async function createCheckoutSession(
    params: CreemCheckoutParams,
    apiKey: string,
    useTestMode = false
): Promise<CreemCheckoutResult> {
    const body: Record<string, unknown> = {
        product_id: params.productId,
        success_url: params.successUrl,
    };

    if (params.customerEmail) {
        body["customer"] = { email: params.customerEmail };
    }

    if (params.metadata && Object.keys(params.metadata).length > 0) {
        body["metadata"] = params.metadata;
    }

    const data = await creemRequest<{ id: string; checkout_url: string }>(
        "/checkouts",
        apiKey,
        "POST",
        body,
        useTestMode
    );

    return {
        checkoutId: data.id,
        checkoutUrl: data.checkout_url,
    };
}

// ----------------------------------------------------------------
// 验证 Creem Webhook 签名（HMAC-SHA256，Edge Runtime 兼容）
// ----------------------------------------------------------------

export async function verifyCreemWebhook(
    payload: string,
    signature: string,
    secret: string
): Promise<boolean> {
    try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signatureBytes = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(payload)
        );

        const computed = Array.from(new Uint8Array(signatureBytes))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");

        return computed === signature;
    } catch {
        return false;
    }
}

// ----------------------------------------------------------------
// 解析 Webhook payload
// ----------------------------------------------------------------

export function parseWebhookEvent(body: unknown): CreemWebhookEvent {
    const data = body as Record<string, unknown>;
    const eventType = (data.eventType || data.event_type || data.type || "") as string;
    const obj = (data.object || data.data || {}) as Record<string, unknown>;

    return {
        eventType,
        object: {
            id: obj.id as string | undefined,
            customerId: (obj.customer_id || obj.customerId) as string | undefined,
            subscriptionId: (obj.subscription_id || obj.subscriptionId) as string | undefined,
            productId: (obj.product_id || obj.productId) as string | undefined,
            status: obj.status as string | undefined,
            currentPeriodStart: (obj.current_period_start || obj.currentPeriodStart) as string | undefined,
            currentPeriodEnd: (obj.current_period_end || obj.currentPeriodEnd) as string | undefined,
            metadata: obj.metadata as Record<string, string> | undefined,
            customer: obj.customer as { email?: string } | undefined,
        },
    };
}

// ----------------------------------------------------------------
// 生成客户门户链接
// ----------------------------------------------------------------

export async function getCustomerPortalLink(
    customerId: string,
    apiKey: string,
    useTestMode = false
): Promise<string> {
    const data = await creemRequest<{ customer_portal_link: string }>(
        `/customers/${customerId}/billing`,
        apiKey,
        "GET",
        undefined,
        useTestMode
    );
    return data.customer_portal_link;
}
