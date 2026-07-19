import { NextResponse } from "next/server";
import { createReservation, ReservationConflictError } from "@/lib/reservations/repository";
import { reservationRequestSchema } from "@/lib/reservations/schema";

export async function POST(request: Request) {
  const parsed = reservationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Please correct the highlighted information.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  try {
    return NextResponse.json(await createReservation(parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof ReservationConflictError)
      return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reservation unavailable." },
      { status: 503 },
    );
  }
}
