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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top color strip */}
      <div className="h-1 bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <img
            src="/lasttour-logo.png"
            alt="Last Tour América"
            className="h-16 w-auto object-contain"
          />
          <div className="text-center">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Portal de Montaje</h1>
            <p className="text-sm text-slate-400 mt-0.5">Control de montaje de eventos</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors mt-2"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-xs text-slate-300 mt-10">Last Tour América SAS · Portal interno</p>
      </div>
    </div>
  );
}
