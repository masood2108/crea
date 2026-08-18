import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendPaymentReceipt({
  to,
  customerName,
  orderNumber,
  invoiceNumber,
  amount,
  currency,
  paymentId,
  pdfBuffer,
}: {
  to: string;
  customerName: string;
  orderNumber: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  paymentId: string;
  pdfBuffer?: Buffer;
}) {
  const recipient = to?.trim();

  if (!recipient) {
    throw new Error("Customer email is missing");
  }

  if (!process.env.SMTP_USER) {
    throw new Error("SMTP_USER is missing");
  }

  if (!process.env.SMTP_PASSWORD) {
    throw new Error("SMTP_PASSWORD is missing");
  }

  await transporter.sendMail({
    from: `"Creator Link Up Network" <${process.env.SMTP_USER}>`,

    to: recipient,

    subject: `Payment confirmed — ${orderNumber}`,

    text: `
Hi ${customerName},

Your payment has been successfully received.

Order: ${orderNumber}
Invoice: ${invoiceNumber}
Amount: ${currency} ${amount}
Payment ID: ${paymentId}

Your invoice is attached to this email.

Thank you for choosing Creator Link Up Network.
`,

    html: `
      <div style="margin:0;padding:40px 20px;background:#f5f5f5;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:20px;padding:40px;">

          <div style="font-size:24px;font-weight:700;">
            Creator Link Up Network
          </div>

          <div style="margin-top:8px;color:#777;font-size:13px;">
            Payment confirmation
          </div>

          <div style="margin-top:35px;padding:20px;border-radius:14px;background:#f0fdf4;color:#166534;">
            <div style="font-size:18px;font-weight:700;">
              Payment successful
            </div>

            <div style="margin-top:6px;font-size:13px;">
              Your payment has been securely verified.
            </div>
          </div>

          <div style="margin-top:30px;">

            <div style="padding:12px 0;border-bottom:1px solid #eee;">
              <strong>Customer</strong>
              <span style="float:right;">
                ${customerName}
              </span>
            </div>

            <div style="padding:12px 0;border-bottom:1px solid #eee;">
              <strong>Order</strong>
              <span style="float:right;">
                ${orderNumber}
              </span>
            </div>

            <div style="padding:12px 0;border-bottom:1px solid #eee;">
              <strong>Invoice</strong>
              <span style="float:right;">
                ${invoiceNumber}
              </span>
            </div>

            <div style="padding:12px 0;border-bottom:1px solid #eee;">
              <strong>Payment ID</strong>
              <span style="float:right;">
                ${paymentId}
              </span>
            </div>

            <div style="padding:18px 0;font-size:20px;">
              <strong>Total paid</strong>
              <span style="float:right;">
                ${currency} ${amount}
              </span>
            </div>

          </div>

          <div style="margin-top:30px;color:#777;font-size:12px;line-height:1.6;">
            Your invoice PDF is attached to this email.
          </div>

        </div>
      </div>
    `,

    attachments: pdfBuffer
      ? [
          {
            filename: `${invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : [],
  });
}