import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const countryConfig = {
  SA: {
    currency: "SAR",
    amount: 999,
  },
  PK: {
    currency: "PKR",
    amount: 999,
  },
  IN: {
    currency: "INR",
    amount: 999,
  },
  OTHER: {
    currency: "USD",
    amount: 999,
  },
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      email,
      country,
      paymentMethod,
    } = body;

    if (!name || !email || !country || !paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Name, email, country and payment method are required",
        },
        { status: 400 }
      );
    }

    const config =
      countryConfig[country as keyof typeof countryConfig];

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          message: "Unsupported country",
        },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        country,
      },
    });

    const orderNumber = `CLN-${Date.now()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        amount: config.amount,
        currency: config.currency,
        country,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        amount: order.amount,
        currency: order.currency,
        country: order.country,
        paymentMethod,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create order",
      },
      { status: 500 }
    );
  }
}