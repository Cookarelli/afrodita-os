"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PublicAppliance } from "@/lib/public-inventory/types";
import { trackEvent } from "@/lib/analytics";
import { categoryLabel } from "./inventory-card";

export function ReservationForm({
  appliances,
  selectedId,
}: {
  appliances: PublicAppliance[];
  selectedId?: string;
}) {
  const router = useRouter();
  const [delivery, setDelivery] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    const payload = {
      appliancePublicId: formData.get("appliancePublicId"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      fulfillment: formData.get("fulfillment"),
      preferredDate: formData.get("preferredDate"),
      addressLine1: formData.get("addressLine1"),
      addressLine2: formData.get("addressLine2"),
      city: formData.get("city"),
      state: formData.get("state"),
      postalCode: formData.get("postalCode"),
      notes: formData.get("notes"),
      communicationConsent: formData.get("communicationConsent") === "on",
      confirmationAcknowledged: formData.get("confirmationAcknowledged") === "on",
    };
    const response = await fetch("/api/public/reservations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Please review your request.");
      setBusy(false);
      return;
    }
    trackEvent("reservation_submission", { reference: result.reference });
    router.push(`/reserve/confirmation?reference=${encodeURIComponent(result.reference)}`);
  }
  return (
    <form className="public-form" action={submit} onFocus={() => trackEvent("reservation_start")}>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      <fieldset>
        <legend>Choose an appliance</legend>
        <label className="full-field">
          <span>Available appliance</span>
          <select required name="appliancePublicId" defaultValue={selectedId ?? ""}>
            <option value="" disabled>
              Select an appliance
            </option>
            {appliances.map((item) => (
              <option value={item.publicId} key={item.publicId}>
                {item.inventoryNumber} — {item.brand} {categoryLabel(item.category)}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      <fieldset>
        <legend>Your contact information</legend>
        <div className="form-grid">
          <label>
            <span>First name</span>
            <input required autoComplete="given-name" maxLength={80} name="firstName" />
          </label>
          <label>
            <span>Last name</span>
            <input required autoComplete="family-name" maxLength={80} name="lastName" />
          </label>
          <label>
            <span>Phone</span>
            <input required autoComplete="tel" inputMode="tel" name="phone" />
          </label>
          <label>
            <span>Email</span>
            <input required autoComplete="email" inputMode="email" name="email" type="email" />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Pickup or delivery</legend>
        <div className="choice-row">
          <label className="choice-card">
            <input
              required
              name="fulfillment"
              type="radio"
              value="pickup"
              defaultChecked
              onChange={() => setDelivery(false)}
            />
            <span>
              <strong>Store pickup</strong>
              <small>Arrange a pickup time after confirmation.</small>
            </span>
          </label>
          <label className="choice-card">
            <input
              required
              name="fulfillment"
              type="radio"
              value="delivery"
              onChange={() => setDelivery(true)}
            />
            <span>
              <strong>Local delivery</strong>
              <small>Subject to address, access, and scheduling.</small>
            </span>
          </label>
        </div>
        <label className="full-field">
          <span>Preferred date</span>
          <input
            required
            name="preferredDate"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
          />
        </label>
        {delivery && (
          <div className="form-grid address-fields">
            <label className="wide-field">
              <span>Delivery address</span>
              <input required autoComplete="street-address" name="addressLine1" />
            </label>
            <label className="wide-field">
              <span>
                Apartment or unit <small>(optional)</small>
              </span>
              <input name="addressLine2" />
            </label>
            <label>
              <span>City</span>
              <input required autoComplete="address-level2" name="city" />
            </label>
            <label>
              <span>State</span>
              <input
                required
                autoComplete="address-level1"
                name="state"
                defaultValue="IL"
                maxLength={2}
              />
            </label>
            <label>
              <span>ZIP code</span>
              <input required autoComplete="postal-code" inputMode="numeric" name="postalCode" />
            </label>
          </div>
        )}
      </fieldset>
      <fieldset>
        <legend>Anything else?</legend>
        <label className="full-field">
          <span>
            Notes <small>(optional)</small>
          </span>
          <textarea
            maxLength={500}
            name="notes"
            rows={4}
            placeholder="Access details, timing, or questions for our team"
          />
        </label>
        <label className="check-field">
          <input name="communicationConsent" type="checkbox" />
          <span>
            I agree that Afrodita may contact me about this request by phone, text, or email.
          </span>
        </label>
        <label className="check-field required-check">
          <input required name="confirmationAcknowledged" type="checkbox" />
          <span>
            I understand this is a request, not a guaranteed hold or completed sale. Afrodita must
            confirm availability and readiness.
          </span>
        </label>
      </fieldset>
      <button
        className="button button-primary button-large submit-button"
        disabled={busy}
        type="submit"
      >
        {busy ? "Submitting request…" : "Submit reservation request"}
      </button>
    </form>
  );
}
