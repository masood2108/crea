import { NextResponse } from "next/server";
import { sendPaymentReceipt } from "@/lib/email";

export async function GET() {
  try {
    await sendPaymentReceipt({
      to: "masoodhussainr8@gmail.com",
      customerName: "Test Customer",
      orderNumber: "CLN-TEST-001",
      invoiceNumber: "CLN-INV-TEST-001",
      amount: "999.00",
      currency: "INR",
      paymentId: "pay_TEST123",
    });

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
    });
  } catch (error) {
    console.error("Test email error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to send test email",
      },
      { status: 500 }
    );
  }
}