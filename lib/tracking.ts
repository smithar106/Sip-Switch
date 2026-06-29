export function trackEvent(name: string, data?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    console.log("[track]", name, data ?? {});
  }
}
