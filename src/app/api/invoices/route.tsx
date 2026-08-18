import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#222222",
  },

  header: {
    marginBottom: 30,
  },

  brand: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 10,
    color: "#666666",
  },

  invoiceTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },

  muted: {
    color: "#666666",
    marginBottom: 4,
  },

  section: {
    marginTop: 24,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
  },

  customerText: {
    marginBottom: 4,
  },

  row: {
    flexDirection: "row",
    marginBottom: 5,
  },

  label: {
    width: 110,
    fontWeight: "bold",
  },

  value: {
    flex: 1,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
    marginTop: 18,
    marginBottom: 18,
  },

  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
    paddingBottom: 8,
    marginBottom: 10,
  },

  descriptionHeader: {
    width: "65%",
    fontWeight: "bold",
  },

  amountHeader: {
    width: "35%",
    textAlign: "right",
    fontWeight: "bold",
  },

  tableRow: {
    flexDirection: "row",
    marginBottom: 12,
  },

  description: {
    width: "65%",
  },

  amount: {
    width: "35%",
    textAlign: "right",
  },

  totalRow: {
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#dddddd",
  },

  totalLabel: {
    width: "65%",
    fontSize: 16,
    fontWeight: "bold",
  },

  totalAmount: {
    width: "35%",
    textAlign: "right",
    fontSize: 16,
    fontWeight: "bold",
  },

  paid: {
    marginTop: 25,
    fontSize: 12,
    fontWeight: "bold",
    color: "#15803d",
  },

  footer: {
    position: "absolute",
    bottom: 50,
    left: 50,
    right: 50,
    textAlign: "center",
    fontSize: 9,
    color: "#777777",
  },
});

function InvoicePDF({
  invoiceNo,
  orderNumber,
  orderDate,
  customerName,
  customerEmail,
  customerCountry,
  gateway,
  method,
  paymentId,
  paymentStatus,
  currency,
  amount,
}: {
  invoiceNo: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  customerCountry: string;
  gateway: string;
  method: string;
  paymentId: string;
  paymentStatus: string;
  currency: string;
  amount: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            Creator Link Up Network
          </Text>

          <Text style={styles.subtitle}>
            Professional Creator Payment Network
          </Text>
        </View>

        <Text style={styles.invoiceTitle}>
          INVOICE
        </Text>

        <Text style={styles.muted}>
          Invoice No: {invoiceNo}
        </Text>

        <Text style={styles.muted}>
          Order No: {orderNumber}
        </Text>

        <Text style={styles.muted}>
          Date: {orderDate}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            BILL TO
          </Text>

          <Text style={styles.customerText}>
            {customerName}
          </Text>

          <Text style={styles.customerText}>
            {customerEmail}
          </Text>

          <Text style={styles.customerText}>
            {customerCountry}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            PAYMENT DETAILS
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>
              Gateway:
            </Text>

            <Text style={styles.value}>
              {gateway}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Method:
            </Text>

            <Text style={styles.value}>
              {method}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Payment ID:
            </Text>

            <Text style={styles.value}>
              {paymentId}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Status:
            </Text>

            <Text style={styles.value}>
              {paymentStatus}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.tableHeader}>
          <Text style={styles.descriptionHeader}>
            DESCRIPTION
          </Text>

          <Text style={styles.amountHeader}>
            AMOUNT
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.description}>
            Creator Network Access
          </Text>

          <Text style={styles.amount}>
            {currency} {amount}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            TOTAL PAID
          </Text>

          <Text style={styles.totalAmount}>
            {currency} {amount}
          </Text>
        </View>

        <Text style={styles.paid}>
          PAYMENT STATUS: PAID
        </Text>

        <Text style={styles.footer}>
          Thank you for choosing Creator Link Up Network.
          {"\n"}
          This is a computer-generated invoice.
        </Text>
      </Page>
    </Document>
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "orderId is required",
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

        payments: {
          where: {
            status: "CAPTURED",
          },

          orderBy: {
            createdAt: "desc",
          },

          take: 1,
        },

        invoice: true,
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

    if (order.status !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invoice can only be generated for paid orders",
        },
        { status: 400 }
      );
    }

    const payment = order.payments[0];

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          message: "Captured payment not found",
        },
        { status: 400 }
      );
    }

    const invoiceNo =
      order.invoice?.invoiceNo ??
      `CLN-INV-${Date.now()}`;

    const invoice =
      order.invoice ??
      (await prisma.invoice.create({
        data: {
          orderId: order.id,
          invoiceNo,
        },
      }));

    const paymentId =
      payment.razorpayPaymentId ??
      payment.gatewayPaymentId ??
      "N/A";

    const pdfBuffer = await renderToBuffer(
      <InvoicePDF
        invoiceNo={invoice.invoiceNo}
        orderNumber={order.orderNumber}
        orderDate={order.createdAt.toLocaleDateString()}
        customerName={order.customer.name}
        customerEmail={order.customer.email}
        customerCountry={order.customer.country}
        gateway={payment.gateway}
        method={payment.method}
        paymentId={paymentId}
        paymentStatus={payment.status}
        currency={order.currency}
        amount={Number(order.amount).toFixed(2)}
      />
    );

    return new NextResponse(
      pdfBuffer as BodyInit,
      {
        status: 200,

        headers: {
          "Content-Type": "application/pdf",

          "Content-Disposition": `attachment; filename="${invoice.invoiceNo}.pdf"`,

          "Content-Length":
            pdfBuffer.length.toString(),

          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Invoice generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate invoice",
      },
      { status: 500 }
    );
  }
}