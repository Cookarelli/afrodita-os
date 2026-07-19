"use client";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
export function ApplianceViewEvent({ publicId }: { publicId: string }) {
  useEffect(() => trackEvent("appliance_view", { publicId }), [publicId]);
  return null;
}
