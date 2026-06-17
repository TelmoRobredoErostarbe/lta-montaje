export const FORMATO_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  CDL: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  BOL: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  TJE: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  TJR: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  IGW: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
};

export function formatoBadgeClass(formato: string) {
  const c = FORMATO_COLOR[formato?.toUpperCase()] || { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };
  return `${c.bg} ${c.text} ${c.border}`;
}
