import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { orderId, paymentMethod } = body;

    if (!orderId || !paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          message: "orderId and paymentMethod are required",
        },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 }
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Order is not available for payment",
        },
        { status: 400 }
      );
    }

    if (order.currency !== "INR") {
      return NextResponse.json(
        {
          success: false,
          message: "Razorpay demo currently supports INR only",
        },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(
      Number(order.amount) * 100
    );

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: order.orderNumber,
      notes: {
        internal_order_id: order.id,
        customer_email: order.customer.email,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        gateway: "razorpay",
        gatewayOrderId: razorpayOrder.id,
        razorpayOrderId: razorpayOrder.id,
        method: paymentMethod,
        amount: order.amount,
        currency: order.currency,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create Razorpay order",
      },
      { status: 500 }
    );
  }
}