import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const inquirySchema = z.object({
  reason: z.enum(["retail", "property_manager", "repair", "delivery", "warranty"]),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.email().max(254),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10).max(2000),
});

export async function createInquiry(input: z.infer<typeof inquirySchema>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (process.env.NODE_ENV !== "development")
      throw new Error("Contact requests are not configured.");
    return `INQ-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("create_contact_inquiry", {
    inquiry_reason: input.reason,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone || null,
    message: input.message,
  });
  if (error) throw new Error("We could not save your inquiry.");
  return data as string;
}
