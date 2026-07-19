"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { AnalyticsEvent } from "@/lib/analytics";
import { trackEvent } from "@/lib/analytics";

export function TrackedLink({
  event,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { event: AnalyticsEvent; children: ReactNode }) {
  return (
    <a
      {...props}
      onClick={(click) => {
        props.onClick?.(click);
        trackEvent(event);
      }}
    >
      {children}
    </a>
  );
}
