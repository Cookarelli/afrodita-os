"use client";

import Link from "next/link";
import { useState } from "react";
import { navItems, siteContent } from "@/config/site";
import { TrackedLink } from "./tracked-link";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>
            {siteContent.address}, {siteContent.cityStateZip}
          </span>
          <TrackedLink event="phone_click" href={siteContent.phoneHref}>
            {siteContent.phone}
          </TrackedLink>
        </div>
      </div>
      <div className="container nav-row">
        <Link className="brand-lockup" href="/" aria-label="Afrodita Appliances home">
          <span className="brand-heart" aria-hidden="true">
            ♥
          </span>
          <span>
            <strong>Afrodita</strong>
            <small>Appliances</small>
          </span>
        </Link>
        <button
          className="menu-button"
          type="button"
          aria-expanded={open}
          aria-controls="site-navigation"
          onClick={() => setOpen(!open)}
        >
          <span aria-hidden="true">{open ? "×" : "☰"}</span>
          <span>Menu</span>
        </button>
        <nav
          className={open ? "main-nav is-open" : "main-nav"}
          id="site-navigation"
          aria-label="Primary navigation"
        >
          {navItems.map(([label, href]) => (
            <Link href={href} key={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link className="nav-reserve" href="/reserve" onClick={() => setOpen(false)}>
            Reserve
          </Link>
          <div className="login-links">
            <Link href="/staff/login">Staff Login</Link>
            <Link href="/property-manager/login">Property Manager Login</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
