import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await signIn(email, password);
    if (error) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
    } else {
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(220 13% 95%)" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12">
        {/* Logo card */}
        <div className="w-full max-w-sm">
          <div className="card-crm rounded-2xl p-8 mb-4 animate-fade-in">
            {/* Logo + title */}
            <div className="flex flex-col items-center mb-8">
              <div className="rounded-2xl p-3 mb-5" style={{ background: "hsl(220 13% 95%)" }}>
                <img src="/lasttour-logo.png" alt="Last Tour" className="h-12 w-auto object-contain" />
              </div>
              <h1 className="text-xl font-bold" style={{ color: "hsl(222 47% 11%)" }}>Portal de Montaje</h1>
              <p className="text-sm mt-1" style={{ color: "hsl(220 9% 46%)" }}>Inicia sesión para continuar</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(220 9% 46%)" }}>
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl px-4 py-3 text-sm transition-all focus:outline-none"
                  style={{
                    border: "1px solid hsl(220 13% 91%)",
                    background: "hsl(220 13% 97%)",
                    color: "hsl(222 47% 11%)",
                  }}
                  placeholder="tu@email.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(220 9% 46%)" }}>
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 text-sm transition-all focus:outline-none"
                  style={{
                    border: "1px solid hsl(220 13% 91%)",
                    background: "hsl(220 13% 97%)",
                    color: "hsl(222 47% 11%)",
                  }}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: "hsl(0 86% 97%)", border: "1px solid hsl(0 96% 89%)", color: "hsl(0 84% 60%)" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all mt-2 focus:outline-none"
                style={{ background: loading ? "hsl(222 47% 30%)" : "hsl(222 47% 11%)", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Iniciando sesión…" : "Entrar"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs" style={{ color: "hsl(218 11% 65%)" }}>
            Last Tour América SAS · Portal interno
          </p>
        </div>
      </div>
    </div>
  );
}
