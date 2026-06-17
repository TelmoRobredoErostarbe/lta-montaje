import { useEffect, useState } from "react";
import {
  Bell, BellOff, Home, CheckCircle2, Share,
  Plus, Smartphone, Monitor, RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC = "BMGegw1BqBPkLsavAj5gRIgt9WW6CFkYaLs0abu7d7-QCxcJiLn3PPDPl7LomUxNRfHmKx8xWkIeeCysGTDy7ZE";

type OS = "ios" | "android" | "desktop" | "unknown";
type NotifStatus = "default" | "granted" | "denied" | "unsupported";
type InstallStatus = "installed" | "installable" | "unavailable";

function detectOS(): OS {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh|Windows|Linux/.test(ua)) return "desktop";
  return "unknown";
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export function GuidePage() {
  const [os] = useState<OS>(detectOS);
  const [notifStatus, setNotifStatus] = useState<NotifStatus>("default");
  const [installStatus, setInstallStatus] = useState<InstallStatus>("unavailable");
  const [standalone] = useState(isInStandaloneMode);
  const [requestingNotif, setRequestingNotif] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);

  useEffect(() => {
    // Notification status
    if (!("Notification" in window)) {
      setNotifStatus("unsupported");
    } else {
      setNotifStatus(Notification.permission as NotifStatus);
      // If already granted, ensure push subscription is saved
      if (Notification.permission === "granted") subscribeToPush();
    }

    // Install status
    if (standalone) {
      setInstallStatus("installed");
    } else if ((window as any).__deferredInstallPrompt) {
      setInstallStatus("installable");
    } else if (os === "ios") {
      setInstallStatus("installable");
    } else {
      setInstallStatus("unavailable");
    }
  }, [os, standalone]);

  async function requestNotifications() {
    if (!("Notification" in window)) return;
    setRequestingNotif(true);
    const perm = await Notification.requestPermission();
    setNotifStatus(perm as NotifStatus);
    if (perm === "granted") await subscribeToPush();
    setRequestingNotif(false);
  }

  async function subscribeToPush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      const { endpoint, keys } = sub.toJSON() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("push_subscriptions").upsert(
          { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
          { onConflict: "user_id,endpoint" }
        );
      }
    } catch (e) {
      console.warn("Push subscribe failed:", e);
    }
  }

  async function sendTestNotif() {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification("LTA Montaje 🎉", {
      body: "Las notificaciones funcionan correctamente.",
      icon: "/lasttour-logo.png",
      badge: "/lasttour-logo.png",
    });
  }

  async function triggerInstall() {
    const prompt = (window as any).__deferredInstallPrompt;
    if (!prompt) {
      if (os === "ios") setShowIOSInstall(true);
      return;
    }
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setInstallStatus("installed");
      (window as any).__deferredInstallPrompt = null;
    }
  }

  const notifDone = notifStatus === "granted";
  const installDone = standalone || installStatus === "installed";
  const allDone = notifDone && installDone;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-400 mt-0.5">Instala la app y activa notificaciones</p>
      </div>

      {/* All done banner */}
      {allDone && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-green-800 text-sm">Todo configurado</p>
            <p className="text-xs text-green-600 mt-0.5">La app está lista para usar</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* PASO 1: Instalar en pantalla de inicio */}
        <StepCard
          number={1}
          done={installDone}
          title="Añadir a pantalla de inicio"
          subtitle={
            installDone
              ? "La app ya está instalada"
              : os === "ios"
              ? "Instala la app desde Safari"
              : os === "android"
              ? "Añade la app a tu pantalla de inicio"
              : "Disponible en móvil (iOS y Android)"
          }
          icon={<Home size={18} />}
          doneColor="bg-blue-500"
        >
          {!installDone && (
            <>
              {(os === "android" || os === "unknown") && installStatus === "installable" && (
                <button
                  onClick={triggerInstall}
                  className="w-full mt-3 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={15} /> Instalar app
                </button>
              )}

              {os === "ios" && (
                <button
                  onClick={() => setShowIOSInstall(v => !v)}
                  className="w-full mt-3 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Share size={15} /> Ver instrucciones para iOS
                </button>
              )}

              {os === "desktop" && (
                <div className="mt-3 flex items-start gap-2.5 bg-slate-50 rounded-xl p-3">
                  <Monitor size={15} className="text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-500">Abre esta página desde tu móvil para instalarla en la pantalla de inicio.</p>
                </div>
              )}

              {installStatus === "unavailable" && os !== "ios" && os !== "desktop" && (
                <div className="mt-3 flex items-start gap-2.5 bg-amber-50 rounded-xl p-3">
                  <Smartphone size={15} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">Abre esta página en Chrome o Safari desde tu móvil para instalarla.</p>
                </div>
              )}

              {/* iOS expandable instructions */}
              {os === "ios" && showIOSInstall && (
                <div className="mt-3 space-y-2">
                  <IOSStep
                    num={1}
                    icon={<Share size={14} className="text-blue-500" />}
                    text={<>Pulsa el botón <strong>Compartir</strong> <Share size={11} className="inline text-blue-500" /> en la barra inferior de Safari</>}
                  />
                  <IOSStep
                    num={2}
                    icon={<Plus size={14} className="text-blue-500" />}
                    text={<>Desplázate y pulsa <strong>"Añadir a pantalla de inicio"</strong></>}
                  />
                  <IOSStep
                    num={3}
                    icon={<CheckCircle2 size={14} className="text-green-500" />}
                    text={<>Pulsa <strong>Añadir</strong> en la esquina superior derecha</>}
                  />
                </div>
              )}
            </>
          )}

          {installDone && (
            <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2.5">
              <CheckCircle2 size={13} />
              App instalada en pantalla de inicio
            </div>
          )}
        </StepCard>

        {/* PASO 2: Notificaciones */}
        <StepCard
          number={2}
          done={notifDone}
          title="Activar notificaciones"
          subtitle={
            notifStatus === "granted"
              ? "Recibirás alertas de tus eventos"
              : notifStatus === "denied"
              ? "Notificaciones bloqueadas en el navegador"
              : notifStatus === "unsupported"
              ? "Tu navegador no soporta notificaciones"
              : "Activa las alertas para no perderte nada"
          }
          icon={<Bell size={18} />}
          doneColor="bg-orange-500"
        >
          {notifStatus === "default" && (
            <button
              onClick={requestNotifications}
              disabled={requestingNotif}
              className="w-full mt-3 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {requestingNotif
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Bell size={15} />}
              Activar notificaciones
            </button>
          )}

          {notifStatus === "granted" && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2.5">
                <CheckCircle2 size={13} />
                Notificaciones activadas correctamente
              </div>
              <button
                onClick={sendTestNotif}
                className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Bell size={14} />
                Enviar notificación de prueba
              </button>
            </div>
          )}

          {notifStatus === "denied" && (
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2.5 bg-red-50 rounded-xl p-3">
                <BellOff size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-600">Has bloqueado las notificaciones. Para activarlas, ve a los ajustes de tu navegador.</p>
              </div>
              {os === "ios" && <IOSNotifInstructions />}
              {os === "android" && <AndroidNotifInstructions />}
            </div>
          )}

          {notifStatus === "unsupported" && (
            <div className="mt-3 flex items-start gap-2.5 bg-slate-50 rounded-xl p-3">
              <BellOff size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500">
                Las notificaciones push no están disponibles en Safari de iOS. Instala la app en tu pantalla de inicio y ábrela desde allí para activarlas.
              </p>
            </div>
          )}
        </StepCard>

        {/* Info: qué son las notificaciones */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">¿Para qué sirven?</p>
          <div className="space-y-2.5">
            {[
              { icon: "📸", text: "Recordatorios antes de cada checkpoint de montaje" },
              { icon: "✅", text: "Confirmación cuando subes una foto correctamente" },
              { icon: "⚠️", text: "Alertas si hay algún paso pendiente" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <span className="text-base leading-none mt-0.5">{icon}</span>
                <p className="text-xs text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dispositivo detectado */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Dispositivo detectado</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
              {os === "ios" || os === "android" ? <Smartphone size={14} className="text-slate-500" /> : <Monitor size={14} className="text-slate-500" />}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 capitalize">{os === "ios" ? "iPhone / iPad (iOS)" : os === "android" ? "Android" : os === "desktop" ? "Ordenador" : "Desconocido"}</p>
              <p className="text-[10px] text-slate-400">{standalone ? "Modo app instalada" : "Navegador web"}</p>
            </div>
            {!standalone && (
              <button onClick={() => window.location.reload()} className="ml-auto text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

/* ── Sub-components ── */

function StepCard({
  number, done, title, subtitle, icon, doneColor, children,
}: {
  number: number;
  done: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  doneColor: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${done ? "border-green-200" : "border-slate-100"}`}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-1">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${done ? `${doneColor} text-white` : "bg-slate-100 text-slate-500"}`}>
            {done ? <CheckCircle2 size={18} /> : icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">PASO {number}</span>
            </div>
            <p className="font-semibold text-sm text-slate-900 leading-tight">{title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function IOSStep({ num, icon, text }: { num: number; icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-blue-50 rounded-xl px-3 py-2.5">
      <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-600 shrink-0 mt-0.5">{num}</span>
      <div className="flex items-start gap-1.5 text-xs text-blue-800">
        <span className="shrink-0 mt-0.5">{icon}</span>
        <p>{text}</p>
      </div>
    </div>
  );
}

function IOSNotifInstructions() {
  return (
    <div className="bg-slate-50 rounded-xl p-3 space-y-2">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Cómo activarlas en iOS</p>
      {[
        "Abre Ajustes → Safari → Notificaciones",
        'Busca esta web y activa "Permitir"',
        "Vuelve aquí y recarga la página",
      ].map((s, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0 mt-0.5">{i + 1}</span>
          <p className="text-xs text-slate-600">{s}</p>
        </div>
      ))}
    </div>
  );
}

function AndroidNotifInstructions() {
  return (
    <div className="bg-slate-50 rounded-xl p-3 space-y-2">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Cómo activarlas en Android</p>
      {[
        "Pulsa el icono de candado en la barra de Chrome",
        'Selecciona "Permisos del sitio"',
        'Activa "Notificaciones"',
      ].map((s, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0 mt-0.5">{i + 1}</span>
          <p className="text-xs text-slate-600">{s}</p>
        </div>
      ))}
    </div>
  );
}
