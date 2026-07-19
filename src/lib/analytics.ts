export type AnalyticsEvent =
  | "phone_click"
  | "directions_click"
  | "appliance_view"
  | "reservation_start"
  | "reservation_submission"
  | "property_manager_inquiry_click";

export function trackEvent(event: AnalyticsEvent, detail: Record<string, string> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("afrodita:analytics", { detail: { event, ...detail } }));
}
