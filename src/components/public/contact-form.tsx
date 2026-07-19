"use client";
import { useState } from "react";
export function ContactForm({ initialReason = "retail" }: { initialReason?: string }) {
  const [status, setStatus] = useState<{
    kind: "idle" | "busy" | "success" | "error";
    message?: string;
  }>({ kind: "idle" });
  async function submit(formData: FormData) {
    setStatus({ kind: "busy" });
    const payload = Object.fromEntries(formData);
    const response = await fetch("/api/public/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setStatus(
      response.ok
        ? { kind: "success", message: `Thanks — your reference is ${result.reference}.` }
        : { kind: "error", message: result.error },
    );
  }
  if (status.kind === "success")
    return (
      <div className="confirmation-card compact-confirmation" role="status">
        <span className="confirmation-mark" aria-hidden="true">
          ✓
        </span>
        <h2>Message received</h2>
        <p>{status.message}</p>
        <p>
          No production email is sent from this preview. The inquiry is stored for staff follow-up
          when connected.
        </p>
      </div>
    );
  return (
    <form action={submit} className="public-form contact-form">
      {status.kind === "error" && (
        <div className="alert alert-error" role="alert">
          {status.message}
        </div>
      )}
      <div className="form-grid">
        <label>
          <span>First name</span>
          <input required name="firstName" autoComplete="given-name" />
        </label>
        <label>
          <span>Last name</span>
          <input required name="lastName" autoComplete="family-name" />
        </label>
        <label>
          <span>Email</span>
          <input required name="email" type="email" autoComplete="email" />
        </label>
        <label>
          <span>
            Phone <small>(optional)</small>
          </span>
          <input name="phone" autoComplete="tel" />
        </label>
        <label className="wide-field">
          <span>Reason for contacting us</span>
          <select name="reason" defaultValue={initialReason}>
            <option value="retail">Retail inquiry</option>
            <option value="property_manager">Property-manager inquiry</option>
            <option value="repair">Repair inquiry</option>
            <option value="delivery">Delivery question</option>
            <option value="warranty">Warranty question</option>
          </select>
        </label>
        <label className="wide-field">
          <span>How can we help?</span>
          <textarea required minLength={10} maxLength={2000} name="message" rows={6} />
        </label>
      </div>
      <button
        disabled={status.kind === "busy"}
        className="button button-primary button-large"
        type="submit"
      >
        {status.kind === "busy" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
