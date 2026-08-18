import { NextRequest, NextResponse } from "next/server";
import {
  CountryCode,
  getPaymentMethods,
} from "@/lib/payments/payment-methods";

export async function GET(request: NextRequest) {
  const country =
    request.nextUrl.searchParams.get("country")?.toUpperCase() as CountryCode;

  if (!country) {
    return NextResponse.json(
      {
        success: false,
        message: "Country is required",
      },
      { status: 400 }
    );
  }

  const methods = getPaymentMethods(country);

  return NextResponse.json({
    success: true,
    country,
    methods,
  });
}