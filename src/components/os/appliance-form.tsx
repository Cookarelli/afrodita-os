import type { ReactNode } from "react";
import { inventoryCategories, inventoryWorkflow } from "@/lib/os/inventory";
import { controlClass, primaryButtonClass } from "@/components/os/operational-ui";

type ApplianceFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  locations: Array<{ id: string; name: string }>;
  appliance?: Record<string, string | number | boolean | null>;
  acquisitionCost?: number;
  repairCost?: number;
  children?: ReactNode;
};

const value = (appliance: ApplianceFormProps["appliance"], key: string) =>
  appliance?.[key] == null ? "" : String(appliance[key]);

export function ApplianceForm({
  action,
  locations,
  appliance,
  acquisitionCost,
  repairCost,
  children,
}: ApplianceFormProps) {
  return (
    <form
      className="grid gap-4 rounded-xl border border-[var(--border)] bg-white p-4 sm:p-6"
      action={action}
    >
      {appliance?.id ? <input name="id" type="hidden" value={value(appliance, "id")} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 font-semibold">
          Inventory number
          <input
            className={controlClass}
            name="inventoryNumber"
            defaultValue={value(appliance, "inventory_number")}
            placeholder="AFR-REF-0001 (auto if blank)"
          />
        </label>
        <label className="grid gap-1 font-semibold">
          Category
          <select
            className={controlClass}
            name="category"
            defaultValue={value(appliance, "category") || "refrigerator"}
          >
            {inventoryCategories.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 font-semibold">
          Brand
          <input
            className={controlClass}
            name="brand"
            defaultValue={value(appliance, "brand")}
            placeholder="Brand"
          />
        </label>
        <label className="grid gap-1 font-semibold">
          Model number
          <input
            className={controlClass}
            name="model"
            defaultValue={value(appliance, "model")}
            placeholder="Model number"
          />
        </label>
        <label className="grid gap-1 font-semibold">
          Serial number
          <input
            className={controlClass}
            name="serialNumber"
            defaultValue={value(appliance, "serial_number")}
            placeholder="Serial number"
          />
        </label>
        <label className="grid gap-1 font-semibold">
          Color
          <input
            className={controlClass}
            name="color"
            defaultValue={value(appliance, "color")}
            placeholder="Color"
          />
        </label>
        <label className="grid gap-1 font-semibold">
          Condition
          <input
            className={controlClass}
            name="condition"
            defaultValue={value(appliance, "condition")}
            placeholder="e.g. Refurbished"
          />
        </label>
        <label className="grid gap-1 font-semibold">
          Store location
          <select
            className={controlClass}
            name="inventoryLocationId"
            defaultValue={value(appliance, "inventory_location_id")}
          >
            <option value="">No location yet</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 font-semibold">
          Workflow status
          <select
            className={controlClass}
            name="status"
            defaultValue={value(appliance, "status") || "intake"}
          >
            {inventoryWorkflow.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 font-semibold">
          Asking price
          <input
            className={controlClass}
            name="publicPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              value(appliance, "public_price_cents")
                ? Number(appliance?.public_price_cents) / 100
                : ""
            }
          />
        </label>
        <label className="grid gap-1 font-semibold">
          Minimum acceptable price
          <input
            className={controlClass}
            name="minimumPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              value(appliance, "minimum_authorized_price_cents")
                ? Number(appliance?.minimum_authorized_price_cents) / 100
                : ""
            }
          />
        </label>
        <label className="grid gap-1 font-semibold">
          Acquisition cost
          <input
            className={controlClass}
            name="acquisitionCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={acquisitionCost == null ? "" : acquisitionCost / 100}
          />
        </label>
        <label className="grid gap-1 font-semibold">
          Parts / repair cost
          <input
            className={controlClass}
            name="repairCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={repairCost == null ? "" : repairCost / 100}
          />
        </label>
      </div>
      <label className="grid gap-1 font-semibold">
        Public description
        <textarea
          className={controlClass}
          name="publicDescription"
          rows={4}
          defaultValue={value(appliance, "public_description")}
          placeholder="What customers should know"
        />
      </label>
      <label className="grid gap-1 font-semibold">
        Internal notes
        <textarea
          className={controlClass}
          name="internalNotes"
          rows={3}
          defaultValue={value(appliance, "internal_notes")}
          placeholder="Staff-only notes"
        />
      </label>
      <div className="flex flex-wrap gap-5 text-sm font-semibold">
        <label className="flex min-h-11 items-center gap-2">
          <input name="featured" type="checkbox" defaultChecked={Boolean(appliance?.featured)} />{" "}
          Feature on storefront
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input
            name="publicVisibility"
            type="checkbox"
            defaultChecked={Boolean(appliance?.public_visibility)}
          />{" "}
          Public listing
        </label>
      </div>
      {children}
      <button className={`${primaryButtonClass} w-full sm:w-auto sm:justify-self-start`}>
        Save appliance
      </button>
    </form>
  );
}
