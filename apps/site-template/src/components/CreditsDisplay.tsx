// apps/site-template/src/components/CreditsDisplay.tsx
// 积分余额显示组件（React Island，client:load）
// 用法：<CreditsDisplay client:load />

import { useState, useEffect } from "react";

interface CreditsState {
  balance: number;
  subscription: {
    status: string;
    periodEnd: string | null;
    planId: string;
  } | null;
  loading: boolean;
  error: string | null;
}

export default function CreditsDisplay() {
  const [state, setState] = useState<CreditsState>({
    balance: 0,
    subscription: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetch("/api/credits/balance")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json() as Promise<{ balance: number; subscription: { status: string; periodEnd: string | null; planId: string } | null; recentTransactions: unknown[] }>;
      })
      .then((data) => setState({ balance: data.balance ?? 0, subscription: data.subscription, loading: false, error: null }))
      .catch((e) => setState((prev) => ({ ...prev, loading: false, error: e.message })));
  }, []);

  if (state.loading) {
    return (
      <div style={styles.wrap}>
        <span style={styles.icon}>⚡</span>
        <span style={{ color: "#9494a8", fontSize: "0.875rem" }}>Loading...</span>
      </div>
    );
  }

  if (state.error) {
    return null; // 未登录时不显示
  }

  const isActive = state.subscription?.status === "active" || state.subscription?.status === "trialing";

  return (
    <div style={styles.wrap}>
      <div style={styles.balanceRow}>
        <span style={styles.icon}>⚡</span>
        <span style={styles.balance}>{state.balance.toLocaleString()}</span>
        <span style={styles.label}>credits</span>
      </div>
      {isActive && (
        <div style={styles.subBadge}>
          <span style={styles.dot}></span>
          Pro Active
        </div>
      )}
      {!isActive && (
        <a href="/pricing" style={styles.upgradeLink}>Get credits →</a>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
    borderRadius: "999px", padding: "0.35rem 0.85rem",
  },
  balanceRow: { display: "flex", alignItems: "center", gap: "0.3rem" },
  icon: { fontSize: "0.875rem" },
  balance: { fontSize: "0.875rem", fontWeight: 700, color: "#f0f0f5" },
  label: { fontSize: "0.75rem", color: "#9494a8" },
  subBadge: {
    display: "flex", alignItems: "center", gap: "0.3rem",
    fontSize: "0.7rem", fontWeight: 700, color: "#10b981",
    background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
    borderRadius: "999px", padding: "0.2rem 0.5rem",
  },
  dot: {
    width: "6px", height: "6px", borderRadius: "50%", background: "#10b981",
    display: "inline-block",
    animation: "pulse 2s ease-in-out infinite",
  },
  upgradeLink: {
    fontSize: "0.75rem", color: "#a78bfa", textDecoration: "none", fontWeight: 600,
  },
};
