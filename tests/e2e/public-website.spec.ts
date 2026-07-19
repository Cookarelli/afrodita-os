import { expect, test } from "@playwright/test";

test("public shopping, reservation, property-manager, and contact journeys", async ({
  page,
}, testInfo) => {
  const publicId =
    testInfo.project.name === "mobile-chrome"
      ? "dev_qr_washer_00000000001"
      : "dev_qr_refrigerator_000001";
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /Affordable appliances/ }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeAttached();
  await page.getByRole("link", { name: "Shop Available Appliances" }).click();
  await expect(page).toHaveURL(/\/shop/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Find an appliance that fits" }),
  ).toBeVisible();
  await page.goto("/shop?category=washer");
  await expect(page.getByText("1 appliance")).toBeVisible();
  await page.getByRole("link", { name: /View Harbor Washer/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Harbor");
  await expect(page.getByText("Acquisition cost")).toHaveCount(0);

  await page.goto(`/reserve?appliance=${publicId}`);
  await page.getByLabel("First name").fill("Jordan");
  await page.getByLabel("Last name").fill("Preview");
  await page.getByLabel("Phone").fill("815-555-0160");
  await page.getByLabel("Email").fill(`${testInfo.project.name}@example.invalid`);
  await page
    .getByLabel("Preferred date")
    .fill(new Date(Date.now() + 172800000).toISOString().slice(0, 10));
  await page.getByLabel(/I understand this is a request/).check();
  await page.getByRole("button", { name: "Submit reservation request" }).click();
  await expect(page).toHaveURL(/\/reserve\/confirmation\?reference=AFR-/);
  await expect(page.getByRole("heading", { level: 1, name: /We’ll check it/ })).toBeVisible();

  await page.goto(`/reserve?appliance=${publicId}`);
  await page.getByLabel("First name").fill("Second");
  await page.getByLabel("Last name").fill("Claim");
  await page.getByLabel("Phone").fill("815-555-0170");
  await page.getByLabel("Email").fill(`second-${testInfo.project.name}@example.invalid`);
  await page
    .getByLabel("Preferred date")
    .fill(new Date(Date.now() + 172800000).toISOString().slice(0, 10));
  await page.getByLabel(/I understand this is a request/).check();
  await page.getByRole("button", { name: "Submit reservation request" }).click();
  await expect(page.getByRole("alert")).toContainText("active reservation");

  await page.goto("/property-managers");
  await expect(page.getByRole("heading", { level: 1, name: /One local team/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Property Manager Login" }).first()).toBeVisible();
  await page.goto("/contact?reason=delivery");
  await expect(page.getByLabel("Reason for contacting us")).toHaveValue("delivery");
  await page.getByLabel("First name").fill("Casey");
  await page.getByLabel("Last name").fill("Preview");
  await page.getByLabel("Email").fill("casey@example.invalid");
  await page
    .getByLabel("How can we help?")
    .fill("Can you confirm delivery availability for Loves Park?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { name: "Message received" })).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
});
