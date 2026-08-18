export type CountryCode = "SA" | "PK" | "IN" | "US" | "OTHER";

export type PaymentMethod = {
  id: string;
  name: string;
  provider: string;
  type: "redirect" | "checkout" | "manual";
};

const paymentMethods: Record<CountryCode, PaymentMethod[]> = {
  SA: [
    {
      id: "mada",
      name: "Mada",
      provider: "paytabs",
      type: "checkout",
    },
    {
      id: "apple_pay",
      name: "Apple Pay",
      provider: "paytabs",
      type: "checkout",
    },
    {
      id: "google_pay",
      name: "Google Pay",
      provider: "paytabs",
      type: "checkout",
    },
    {
      id: "card",
      name: "Credit / Debit Card",
      provider: "paytabs",
      type: "checkout",
    },
  ],

  PK: [
    {
      id: "easypaisa",
      name: "Easypaisa",
      provider: "easypaisa",
      type: "checkout",
    },
    {
      id: "sadabiz",
      name: "SadaBiz",
      provider: "sadabiz",
      type: "redirect",
    },
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      provider: "bank",
      type: "manual",
    },
    {
      id: "card",
      name: "Credit / Debit Card",
      provider: "easypaisa",
      type: "checkout",
    },
  ],

  IN: [
    {
      id: "upi",
      name: "UPI",
      provider: "razorpay",
      type: "checkout",
    },
    {
      id: "card",
      name: "Credit / Debit Card",
      provider: "razorpay",
      type: "checkout",
    },
    {
      id: "google_pay",
      name: "Google Pay",
      provider: "razorpay",
      type: "checkout",
    },
  ],

  US: [
    {
      id: "paypal",
      name: "PayPal",
      provider: "paypal",
      type: "redirect",
    },
    {
      id: "card",
      name: "Credit / Debit Card",
      provider: "paypal",
      type: "checkout",
    },
    {
      id: "apple_pay",
      name: "Apple Pay",
      provider: "paypal",
      type: "checkout",
    },
    {
      id: "google_pay",
      name: "Google Pay",
      provider: "paypal",
      type: "checkout",
    },
  ],

  OTHER: [
    {
      id: "paypal",
      name: "PayPal",
      provider: "paypal",
      type: "redirect",
    },
    {
      id: "card",
      name: "Credit / Debit Card",
      provider: "paypal",
      type: "checkout",
    },
  ],
};

export function getPaymentMethods(
  country: CountryCode
): PaymentMethod[] {
  return paymentMethods[country] ?? paymentMethods.OTHER;
}