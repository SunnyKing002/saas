// apps/site-template/src/components/AuthButton.tsx
// Navbar 右上角动态登录/用户下拉菜单（React Client Island）
// 通过 /api/auth/me 接口动态检测登录状态

import { useEffect, useState, useRef } from "react";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: "user" | "admin";
}

const WORKER_API = (import.meta as any).env?.WORKER_API_URL || "http://localhost:8787";

export default function AuthButton() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${WORKER_API}/api/auth/me`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ user: AuthUser | null }>)
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch(`${WORKER_API}/api/auth/logout`, { method: "POST", credentials: "include" });
    } finally {
      setUser(null);
      setMenuOpen(false);
      setLoggingOut(false);
      window.location.href = "/";
    }
  };

  if (loading) {
    return (
      <div aria-label="Loading user status" style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }} />
    );
  }

  if (!user) {
    return (
      <a
        href="/auth/login"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "white",
          borderRadius: "10px",
          padding: "0.5rem 1.125rem",
          minHeight: "40px",
          fontSize: "0.875rem",
          fontWeight: 600,
          textDecoration: "none",
          transition: "all 0.2s",
          boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 16px rgba(99,102,241,0.4)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 8px rgba(99,102,241,0.3)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="1.8"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        Sign In
      </a>
    );
  }

  // 已登录：头像 + 下拉菜单
  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        aria-label={`User menu for ${user.displayName}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: menuOpen ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "12px",
          padding: "0.3rem 0.625rem 0.3rem 0.35rem",
          minHeight: "40px",
          cursor: "pointer",
          transition: "all 0.2s",
          color: "#e2e8f0",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
        onMouseLeave={(e) => { if (!menuOpen) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
      >
        <AvatarImg src={user.avatarUrl} name={user.displayName} />
        <span style={{ fontSize: "0.8rem", fontWeight: 600, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.displayName?.split(" ")[0]}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
          style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", opacity: 0.5 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {menuOpen && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 220,
            background: "rgba(12,12,20,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: "0.5rem",
            backdropFilter: "blur(20px)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)",
            animation: "dropIn 0.15s ease-out",
            zIndex: 100,
          }}
        >
          {/* User info header */}
          <div style={{ padding: "0.75rem 0.75rem 0.625rem", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "0.375rem" }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#e2e8f0", fontSize: "0.875rem" }}>{user.displayName}</p>
            <p style={{ margin: "0.2rem 0 0", color: "#475569", fontSize: "0.775rem" }}>{user.email}</p>
          </div>

          {/* Menu items */}
          <MenuLink href="/dashboard" icon={dashboardIcon} label="Dashboard" />
          <MenuLink href="#" icon={profileIcon} label="Edit Profile" />
          <MenuLink href="/#pricing" icon={upgradeIcon} label="Upgrade Plan" highlight />

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "0.375rem 0" }}></div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            role="menuitem"
            style={{
              display: "flex", alignItems: "center", gap: "0.625rem", width: "100%",
              padding: "0.5rem 0.75rem", borderRadius: 10, minHeight: 36,
              background: "none", border: "none", color: "#64748b", fontSize: "0.85rem",
              fontWeight: 500, cursor: loggingOut ? "not-allowed" : "pointer",
              transition: "all 0.15s", textAlign: "left",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
          >
            {logoutIcon}
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ----

function AvatarImg({ src, name }: { src: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <span style={{
        width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#c084fc)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.75rem", fontWeight: 700, color: "white", flexShrink: 0,
      }}>
        {name?.[0]?.toUpperCase() ?? "U"}
      </span>
    );
  }
  return (
    <img src={src} alt={name} width={28} height={28}
      style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      onError={() => setErr(true)} />
  );
}

function MenuLink({ href, icon, label, highlight }: { href: string; icon: React.ReactNode; label: string; highlight?: boolean }) {
  return (
    <a
      href={href}
      role="menuitem"
      style={{
        display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.75rem",
        borderRadius: 10, minHeight: 36, color: highlight ? "#a5b4fc" : "#94a3b8",
        fontSize: "0.85rem", fontWeight: 500, textDecoration: "none", transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLAnchorElement).style.color = "#e2e8f0"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "none"; (e.currentTarget as HTMLAnchorElement).style.color = highlight ? "#a5b4fc" : "#94a3b8"; }}
    >
      {icon}
      {label}
    </a>
  );
}

const dashboardIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>;
const profileIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
const upgradeIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>;
const logoutIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 3.5h3a1 1 0 011 1v15a1 1 0 01-1 1h-3M11 16l4-4-4-4M15 12H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
