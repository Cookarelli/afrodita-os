import { NextResponse } from "next/server";
import { createInquiry, inquirySchema } from "@/lib/inquiries";
export async function POST(request: Request) {
  const parsed = inquirySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Please complete every required field." }, { status: 400 });
  try {
    return NextResponse.json({ reference: await createInquiry(parsed.data) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Contact request unavailable." },
      { status: 503 },
    );
  }
}
