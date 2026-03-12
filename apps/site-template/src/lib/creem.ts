// apps/site-template/src/lib/creem.ts
// 本地 Creem 封装（重新导出 packages/core 的实现，避免路径问题）
// Worker 从此文件 import，与 packages/core 共用一套实现

export interface CreemCheckoutParams {
  productId: string;
  successUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface CreemCheckoutResult {
  checkoutId: string;
  checkoutUrl: string;
}

export interface CreemWebhookObject {
  id?: string;
  customerId?: string;
  subscriptionId?: string;
  productId?: string;
  status?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  metadata?: Record<string, string>;
  customer?: { email?: string };
}

export interface CreemWebhookEvent {
  eventType: string;
  object?: CreemWebhookObject;
}

async function creemFetch<T>(
  path: string,
  apiKey: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
  useTestMode = false
): Promise<T> {
  const base = useTestMode ? "https://test-api.creem.io/v1" : "https://api.creem.io/v1";
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "x-api-key": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Creem API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function createCheckoutSession(
  params: CreemCheckoutParams,
  apiKey: string,
  useTestMode = false
): Promise<CreemCheckoutResult> {
  const body: Record<string, unknown> = {
    product_id: params.productId,
    success_url: params.successUrl,
  };
  if (params.customerEmail) body["customer"] = { email: params.customerEmail };
  if (params.metadata) body["metadata"] = params.metadata;

  const data = await creemFetch<{ id: string; checkout_url: string }>("/checkouts", apiKey, "POST", body, useTestMode);
  return { checkoutId: data.id, checkoutUrl: data.checkout_url };
}

export async function verifyCreemWebhook(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return computed === signature;
  } catch {
    return false;
  }
}

export function parseWebhookEvent(body: unknown): CreemWebhookEvent {
  const d = body as Record<string, unknown>;
  const eventType = (d.eventType ?? d.event_type ?? d.type ?? "") as string;
  const obj = (d.object ?? d.data ?? {}) as Record<string, unknown>;
  return {
    eventType,
    object: {
      id: obj.id as string | undefined,
      customerId: (obj.customer_id ?? obj.customerId) as string | undefined,
      subscriptionId: (obj.subscription_id ?? obj.subscriptionId) as string | undefined,
      productId: (obj.product_id ?? obj.productId) as string | undefined,
      status: obj.status as string | undefined,
      currentPeriodStart: (obj.current_period_start ?? obj.currentPeriodStart) as string | undefined,
      currentPeriodEnd: (obj.current_period_end ?? obj.currentPeriodEnd) as string | undefined,
      metadata: obj.metadata as Record<string, string> | undefined,
      customer: obj.customer as { email?: string } | undefined,
    },
  };
}

export async function getCustomerPortalLink(customerId: string, apiKey: string, useTestMode = false): Promise<string> {
  const data = await creemFetch<{ customer_portal_link: string }>(`/customers/${customerId}/billing`, apiKey, "GET", undefined, useTestMode);
  return data.customer_portal_link;
}
