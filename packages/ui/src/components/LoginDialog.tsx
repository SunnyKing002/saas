// packages/ui/src/components/LoginDialog.tsx
// 登录对话框 - React Island 组件（占位实现）
// 以 client:load 方式在 Astro 中使用：
//   import { LoginDialog } from "@saas-matrix/ui";
//   <LoginDialog client:load />

import { useState } from "react";

export interface LoginDialogProps {
    /** 对话框是否可见（受控模式，可选） */
    open?: boolean;
    onClose?: () => void;
}

/**
 * 登录对话框（占位）
 * TODO: 集成实际认证方案后替换此组件
 * 推荐：Auth.js / Lucia Auth / Cloudflare Access
 */
export default function LoginDialog({ open: initialOpen = false, onClose }: LoginDialogProps) {
    const [open, setOpen] = useState(initialOpen);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleClose = () => {
        setOpen(false);
        onClose?.();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // TODO: 调用 /api/auth/login 接口
        console.log("Login:", { email, password });
        await new Promise((r) => setTimeout(r, 1000));
        setLoading(false);
        alert("TODO: 认证模块尚未实现，请参考 DEPLOY.md 配置 Auth");
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                style={{
                    padding: "0.5rem 1.2rem",
                    background: "linear-gradient(135deg, #6366f1, #818cf8)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                }}
            >
                Sign In
            </button>
        );
    }

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
            onClick={handleClose}
        >
            <div
                style={{
                    background: "#13131a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    padding: "2rem",
                    width: "100%",
                    maxWidth: "400px",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ color: "#fff", margin: "0 0 1.5rem", fontSize: "1.4rem", fontWeight: 700 }}>
                    Sign In
                </h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "1rem" }}>
                        <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "0.4rem" }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            style={{
                                width: "100%",
                                padding: "0.6rem 0.9rem",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                                color: "#e2e8f0",
                                fontSize: "0.9rem",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: "1.5rem" }}>
                        <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "0.4rem" }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{
                                width: "100%",
                                padding: "0.6rem 0.9rem",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                                color: "#e2e8f0",
                                fontSize: "0.9rem",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "0.7rem",
                            background: loading ? "#475569" : "linear-gradient(135deg, #6366f1, #818cf8)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                            fontSize: "0.95rem",
                        }}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>
                <button
                    onClick={handleClose}
                    style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.2rem" }}
                    aria-label="Close"
                >
                    ×
                </button>
            </div>
        </div>
    );
}
