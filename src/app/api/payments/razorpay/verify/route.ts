import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/invoice";
import { sendPaymentReceipt } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      orderId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = body;

    if (
      !orderId ||
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment verification data is incomplete",
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

    const customerEmail =
      order.customer.email?.trim();

    if (!customerEmail) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer email is missing from order",
        },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        orderId: order.id,
        razorpayOrderId,
      },
    });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment record not found",
        },
        { status: 404 }
      );
    }

    if (payment.status === "CAPTURED") {
      return NextResponse.json({
        success: true,
        message: "Payment already verified",
        payment: {
          id: payment.id,
          status: payment.status,
          razorpayPaymentId:
            payment.razorpayPaymentId,
        },
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
        },
      });
    }

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      throw new Error(
        "RAZORPAY_KEY_SECRET is missing"
      );
    }

    const generatedSignature =
      crypto
        .createHmac("sha256", keySecret)
        .update(
          `${razorpayOrderId}|${razorpayPaymentId}`
        )
        .digest("hex");

    const generatedBuffer =
      Buffer.from(generatedSignature);

    const receivedBuffer =
      Buffer.from(razorpaySignature);

    if (
      generatedBuffer.length !==
      receivedBuffer.length
    ) {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "FAILED",
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment signature",
        },
        { status: 400 }
      );
    }

    const signaturesMatch =
      crypto.timingSafeEqual(
        generatedBuffer,
        receivedBuffer
      );

    if (!signaturesMatch) {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "FAILED",
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment signature",
        },
        { status: 400 }
      );
    }

    const updatedPayment =
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: "CAPTURED",
        },
      });

    const updatedOrder =
      await prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: "PAID",
        },
        include: {
          customer: true,
        },
      });

    const existingInvoice =
      await prisma.invoice.findUnique({
        where: {
          orderId: updatedOrder.id,
        },
      });

    const invoice =
      existingInvoice ??
      (await prisma.invoice.create({
        data: {
          orderId: updatedOrder.id,
          invoiceNo: `CLN-INV-${Date.now()}`,
        },
      }));

    const paymentId =
      updatedPayment.razorpayPaymentId ??
      updatedPayment.gatewayPaymentId ??
      "N/A";

    const pdfBuffer =
      await generateInvoicePDF({
        invoiceNo: invoice.invoiceNo,
        orderNumber:
          updatedOrder.orderNumber,
        orderDate:
          updatedOrder.createdAt.toLocaleDateString(),
        customerName:
          updatedOrder.customer.name,
        customerEmail:
          customerEmail,
        customerCountry:
          updatedOrder.customer.country,
        gateway:
          updatedPayment.gateway,
        method:
          updatedPayment.method,
        paymentId,
        paymentStatus:
          updatedPayment.status,
        currency:
          updatedOrder.currency,
        amount:
          Number(
            updatedOrder.amount
          ).toFixed(2),
      });

    await sendPaymentReceipt({
      to: customerEmail,
      customerName:
        updatedOrder.customer.name,
      orderNumber:
        updatedOrder.orderNumber,
      invoiceNumber:
        invoice.invoiceNo,
      amount:
        Number(
          updatedOrder.amount
        ).toFixed(2),
      currency:
        updatedOrder.currency,
      paymentId,
      pdfBuffer,
    });

    return NextResponse.json({
      success: true,
      message:
        "Payment verified, invoice generated and receipt sent",
      payment: {
        id: updatedPayment.id,
        status:
          updatedPayment.status,
        razorpayPaymentId:
          updatedPayment.razorpayPaymentId,
      },
      order: {
        id: updatedOrder.id,
        orderNumber:
          updatedOrder.orderNumber,
        status:
          updatedOrder.status,
      },
      invoice: {
        id: invoice.id,
        invoiceNo:
          invoice.invoiceNo,
      },
      receipt: {
        sentTo: customerEmail,
      },
    });
  } catch (error) {
    console.error(
      "Razorpay verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Payment verification failed",
      },
      { status: 500 }
    );
  }
}