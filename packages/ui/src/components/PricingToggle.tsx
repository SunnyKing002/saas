// packages/ui/src/components/PricingToggle.tsx
// 定价切换组件（月付/年付）- React Island 组件
// 用法：<PricingToggle client:load />
// 注：实际定价数据从父页面传入，详见首页 pricing section

import { useState } from "react";

export default function PricingToggle({
    onToggle,
}: {
    onToggle?: (cycle: "monthly" | "yearly") => void;
}) {
    const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

    const toggle = (next: "monthly" | "yearly") => {
        setCycle(next);
        onToggle?.(next);
    };

    return (
        <div
            style={{
                display: "inline-flex",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "100px",
                padding: "4px",
                gap: "2px",
            }}
        >
            {(["monthly", "yearly"] as const).map((c) => (
                <button
                    key={c}
                    onClick={() => toggle(c)}
                    style={{
                        padding: "0.4rem 1rem",
                        borderRadius: "100px",
                        border: "none",
                        background: cycle === c ? "linear-gradient(135deg, #6366f1, #818cf8)" : "transparent",
                        color: cycle === c ? "#fff" : "#64748b",
                        fontWeight: cycle === c ? 600 : 400,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                    }}
                >
                    {c === "monthly" ? "Monthly" : "Yearly"}{" "}
                    {c === "yearly" && (
                        <span style={{ fontSize: "0.75rem", color: cycle === "yearly" ? "#c084fc" : "#475569" }}>
                            −20%
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
