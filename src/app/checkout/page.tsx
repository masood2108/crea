"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type Country = "SA" | "PK" | "IN" | "OTHER";

type PaymentMethod = {
  id: string;
  name: string;
  provider: string;
  type: "redirect" | "checkout" | "manual";
};

const countries = [
  {
    code: "SA" as Country,
    name: "Saudi Arabia",
    short: "Saudi",
    flag: "🇸🇦",
    currency: "SAR",
  },
  {
    code: "PK" as Country,
    name: "Pakistan",
    short: "Pakistan",
    flag: "🇵🇰",
    currency: "PKR",
  },
  {
    code: "IN" as Country,
    name: "India",
    short: "India",
    flag: "🇮🇳",
    currency: "INR",
  },
  {
    code: "OTHER" as Country,
    name: "International",
    short: "Global",
    flag: "◎",
    currency: "USD",
  },
];

const fallbackMethods: Record<Country, PaymentMethod[]> = {
  SA: [
    {
      id: "mada",
      name: "Mada",
      provider: "PayTabs",
      type: "checkout",
    },
    {
      id: "apple_pay",
      name: "Apple Pay",
      provider: "PayTabs",
      type: "checkout",
    },
    {
      id: "google_pay",
      name: "Google Pay",
      provider: "PayTabs",
      type: "checkout",
    },
    {
      id: "card",
      name: "Credit / Debit Card",
      provider: "PayTabs",
      type: "checkout",
    },
  ],

  PK: [
    {
      id: "easypaisa",
      name: "Easypaisa",
      provider: "Easypaisa",
      type: "checkout",
    },
    {
      id: "sadabiz",
      name: "SadaBiz",
      provider: "SadaBiz",
      type: "redirect",
    },
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      provider: "Manual verification",
      type: "manual",
    },
    {
      id: "card",
      name: "Credit / Debit Card",
      provider: "Easypaisa",
      type: "checkout",
    },
  ],

  IN: [
    {
      id: "upi",
      name: "UPI",
      provider: "Razorpay",
      type: "checkout",
    },
    {
      id: "google_pay",
      name: "Google Pay",
      provider: "Razorpay",
      type: "checkout",
    },
    {
      id: "card",
      name: "Credit / Debit Card",
      provider: "Razorpay",
      type: "checkout",
    },
  ],

  OTHER: [
    {
      id: "paypal",
      name: "PayPal",
      provider: "PayPal",
      type: "redirect",
    },
    {
      id: "card",
      name: "Credit / Debit Card",
      provider: "PayPal",
      type: "checkout",
    },
    {
      id: "apple_pay",
      name: "Apple Pay",
      provider: "PayPal",
      type: "checkout",
    },
    {
      id: "google_pay",
      name: "Google Pay",
      provider: "PayPal",
      type: "checkout",
    },
  ],
};

const methodIcons: Record<string, string> = {
  mada: "M",
  apple_pay: "",
  google_pay: "G",
  card: "CARD",
  easypaisa: "e",
  sadabiz: "S",
  bank_transfer: "↗",
  upi: "UPI",
  paypal: "P",
};

export default function CheckoutPage() {
  const [country, setCountry] = useState<Country>("IN");

  const [methods, setMethods] = useState<PaymentMethod[]>(
    fallbackMethods.IN
  );

  const [selectedMethod, setSelectedMethod] = useState("upi");

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [creatingOrder, setCreatingOrder] = useState(false);

  const [orderError, setOrderError] = useState("");

  const [orderCreated, setOrderCreated] = useState("");

  const currentCountry =
    countries.find((item) => item.code === country) ?? countries[2];

  const selectedPayment = methods.find(
    (method) => method.id === selectedMethod
  );

  useEffect(() => {
    async function loadMethods() {
      setLoading(true);
      setOrderError("");

      try {
        const response = await fetch(
          `/api/payment-methods?country=${country}`
        );

        if (!response.ok) {
          throw new Error("Failed to load payment methods");
        }

        const data = await response.json();

        setMethods(data.methods);
        setSelectedMethod(data.methods[0]?.id ?? "");
      } catch {
        setMethods(fallbackMethods[country]);

        setSelectedMethod(
          fallbackMethods[country][0]?.id ?? ""
        );
      } finally {
        setLoading(false);
      }
    }

    loadMethods();
  }, [country]);

async function handlePayment() {
  setOrderError("");
  setOrderCreated("");

  if (!name.trim()) {
    setOrderError("Enter your full name.");
    return;
  }

const emailValue = email.trim();

if (!emailValue) {
  setOrderError("Enter your email address.");
  return;
}
const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(emailValue)) {
  setOrderError("Enter a valid email address.");
  return;
}

  if (!selectedMethod) {
    setOrderError("Select a payment method.");
    return;
  }

  if (country !== "IN") {
    setOrderError(
      "Razorpay test checkout currently supports India."
    );
    return;
  }

  setCreatingOrder(true);

  try {
    // 1. Create our DB order
    const orderResponse = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
  email: emailValue,       
   country,
        paymentMethod: selectedMethod,
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok || !orderData.success) {
      throw new Error(
        orderData.message || "Failed to create order"
      );
    }

    const internalOrderId = orderData.order.id;

    setOrderCreated(orderData.order.orderNumber);

    // 2. Create Razorpay order
    const razorpayResponse = await fetch(
      "/api/payments/razorpay/create-order",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: internalOrderId,
          paymentMethod: selectedMethod,
        }),
      }
    );

    const razorpayData = await razorpayResponse.json();

    if (!razorpayResponse.ok || !razorpayData.success) {
      throw new Error(
        razorpayData.message ||
          "Failed to create Razorpay order"
      );
    }

    // 3. Load Razorpay Checkout
    const loadRazorpay = () => {
      return new Promise<boolean>((resolve) => {
        const existingScript = document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        );

        if (existingScript) {
          resolve(true);
          return;
        }

        const script = document.createElement("script");

        script.src =
          "https://checkout.razorpay.com/v1/checkout.js";

        script.onload = () => resolve(true);

        script.onerror = () => resolve(false);

        document.body.appendChild(script);
      });
    };

    const razorpayLoaded = await loadRazorpay();

    if (!razorpayLoaded) {
      throw new Error(
        "Unable to load Razorpay Checkout."
      );
    }

    // 4. Open Razorpay
    const RazorpayConstructor = (
      window as unknown as {
        Razorpay: new (options: Record<string, unknown>) => {
          open: () => void;
        };
      }
    ).Razorpay;

    if (!RazorpayConstructor) {
      throw new Error(
        "Razorpay Checkout is unavailable."
      );
    }

    const options = {
      key: razorpayData.razorpay.keyId,

      amount: razorpayData.razorpay.amount,

      currency: razorpayData.razorpay.currency,

      name: "Creator Link Up Network",

      description: "Creator Network Access",

      order_id: razorpayData.razorpay.orderId,

      prefill: {
        name: name.trim(),
        email: email.trim(),
      },

      notes: {
        internal_order_id: internalOrderId,
      },

      theme: {
        color: "#000000",
      },

  handler: async function (response: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}) {
  try {
    setCreatingOrder(true);
    setOrderError("");

    const verifyResponse = await fetch(
      "/api/payments/razorpay/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: internalOrderId,
          razorpayPaymentId:
            response.razorpay_payment_id,
          razorpayOrderId:
            response.razorpay_order_id,
          razorpaySignature:
            response.razorpay_signature,
        }),
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyData.success) {
      throw new Error(
        verifyData.message ||
          "Payment verification failed"
      );
    }

    console.log(
      "PAYMENT VERIFIED:",
      verifyData
    );

    setOrderCreated(
      verifyData.order.orderNumber
    );
  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    setOrderError(
      error instanceof Error
        ? error.message
        : "Payment verification failed."
    );
  } finally {
    setCreatingOrder(false);
  }
},
    };

    const razorpay = new RazorpayConstructor(
      options
    );

    razorpay.open();
  } catch (error) {
    console.error(
      "Payment error:",
      error
    );

    setOrderError(
      error instanceof Error
        ? error.message
        : "Payment could not be started."
    );
  } finally {
    setCreatingOrder(false);
  }
}

  return (
    <main className="min-h-screen overflow-hidden bg-[#070707] text-white">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[140px]" />

        <div className="absolute right-[-180px] top-[20%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[160px]" />

        <div className="absolute bottom-[-200px] left-[30%] h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* HEADER */}
      <header className="relative z-10 border-b border-white/[0.08]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-black">
              CL
            </div>

            <div>
              <p className="text-sm font-semibold tracking-tight">
                Creator Link Up
              </p>

              <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">
                Network
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/55 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" />
            Secure checkout
          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_480px] lg:items-start">

          {/* LEFT SIDE */}
          <section className="pt-2 lg:pt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px w-10 bg-white/30" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
                  Checkout
                </span>
              </div>

              <h1 className="max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Connect.
                <br />
                Create.
                <br />
                <span className="text-white/30">
                  Grow.
                </span>
              </h1>

              <p className="mt-7 max-w-lg text-sm leading-6 text-white/45 sm:text-base">
                Complete your payment securely and unlock
                your Creator Link Up Network experience.
              </p>
            </motion.div>

            {/* PROGRESS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15,
                duration: 0.6,
              }}
              className="mt-12 hidden max-w-xl sm:block"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black">
                    01
                  </span>

                  <span className="text-xs text-white/70">
                    Country
                  </span>
                </div>

                <div className="h-px flex-1 bg-white/10" />

                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-bold text-white/50">
                    02
                  </span>

                  <span className="text-xs text-white/35">
                    Payment
                  </span>
                </div>

                <div className="h-px flex-1 bg-white/10" />

                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-bold text-white/50">
                    03
                  </span>

                  <span className="text-xs text-white/35">
                    Confirm
                  </span>
                </div>
              </div>
            </motion.div>

            {/* COUNTRY */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.25,
                duration: 0.6,
              }}
              className="mt-10 max-w-xl"
            >
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
                    01 / Location
                  </p>

                  <h2 className="mt-2 text-lg font-medium">
                    Where are you paying from?
                  </h2>
                </div>

                <span className="text-xs text-white/25">
                  {currentCountry.currency}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {countries.map((item) => {
                  const active = country === item.code;

                  return (
                    <motion.button
                      key={item.code}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setCountry(item.code)}
                      className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-white/20 bg-white text-black"
                          : "border-white/[0.08] bg-white/[0.035] text-white hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="countryGlow"
                          className="absolute inset-0 bg-white"
                        />
                      )}

                      <div className="relative z-10">
                        <div className="text-lg">
                          {item.flag}
                        </div>

                        <div className="mt-3 text-xs font-semibold">
                          {item.short}
                        </div>

                        <div
                          className={`mt-1 text-[10px] ${
                            active
                              ? "text-black/40"
                              : "text-white/25"
                          }`}
                        >
                          {item.currency}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* PAYMENT */}
            <motion.div
              layout
              className="mt-10 max-w-xl"
            >
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
                    02 / Payment
                  </p>

                  <h2 className="mt-2 text-lg font-medium">
                    Choose payment method
                  </h2>
                </div>

                {loading && (
                  <span className="text-[10px] text-white/30">
                    Updating...
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {methods.map((method, index) => {
                    const active =
                      selectedMethod === method.id;

                    return (
                      <motion.button
                        layout
                        key={method.id}
                        type="button"
                        initial={{
                          opacity: 0,
                          y: 10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          y: -10,
                        }}
                        transition={{
                          delay: index * 0.04,
                          duration: 0.25,
                        }}
                        whileTap={{
                          scale: 0.99,
                        }}
                        onClick={() =>
                          setSelectedMethod(method.id)
                        }
                        className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-white/20 bg-white text-black"
                            : "border-white/[0.08] bg-white/[0.035] hover:border-white/15 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold ${
                            active
                              ? "bg-black text-white"
                              : "bg-white/[0.07] text-white/60"
                          }`}
                        >
                          {methodIcons[method.id] ??
                            "•"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">
                            {method.name}
                          </p>

                          <p
                            className={`mt-1 text-[10px] ${
                              active
                                ? "text-black/40"
                                : "text-white/30"
                            }`}
                          >
                            Powered by{" "}
                            {method.provider}
                          </p>
                        </div>

                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            active
                              ? "border-black"
                              : "border-white/15"
                          }`}
                        >
                          {active && (
                            <motion.div
                              layoutId="paymentDot"
                              className="h-2.5 w-2.5 rounded-full bg-black"
                            />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* CUSTOMER DETAILS */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.35,
                duration: 0.6,
              }}
              className="mt-10 max-w-xl"
            >
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
                  03 / Details
                </p>

                <h2 className="mt-2 text-lg font-medium">
                  Your details
                </h2>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  className="h-14 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25 focus:bg-white/[0.06]"
                />

                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  className="h-14 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25 focus:bg-white/[0.06]"
                />
              </div>
            </motion.div>
          </section>

          {/* RIGHT CARD */}
          <motion.aside
            initial={{
              opacity: 0,
              x: 30,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              delay: 0.15,
              duration: 0.7,
            }}
            className="relative lg:sticky lg:top-8"
          >
            <div className="absolute -inset-4 rounded-[40px] bg-white/[0.025] blur-2xl" />

            <div className="relative overflow-hidden rounded-[30px] border border-white/[0.1] bg-[#111111]/90 p-5 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl sm:p-7">
              {/* CARD HEADER */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
                    Your order
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    Creator Package
                  </h2>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold">
                  CL
                </div>
              </div>

              {/* PRODUCT */}
              <div className="mt-7 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-blue-500/20">
                    <div className="text-xl font-black text-white/80">
                      CL
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      Creator Network Access
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      Digital creator package
                    </p>
                  </div>
                </div>
              </div>

              {/* PRICE */}
              <div className="mt-7 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/35">
                    Subtotal
                  </span>

                  <span>
                    {currentCountry.currency} 999
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-white/35">
                    Processing
                  </span>

                  <span className="text-xs text-white/35">
                    Calculated securely
                  </span>
                </div>
              </div>

              <div className="my-6 h-px bg-white/[0.08]" />

              {/* TOTAL */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-white/30">
                    Total today
                  </p>

                  <p className="mt-1 text-xs text-white/20">
                    {currentCountry.name}
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentCountry.currency}
                    initial={{
                      opacity: 0,
                      y: 8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -8,
                    }}
                    className="text-3xl font-semibold tracking-[-0.04em]"
                  >
                    {currentCountry.currency} 999
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ERROR */}
              <AnimatePresence>
                {orderError && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                    }}
                    className="overflow-hidden"
                  >
                    <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs text-red-300">
                      {orderError}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SUCCESS */}
              <AnimatePresence>
                {orderCreated && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-black">
                        ✓
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-emerald-300">
                          Order created
                        </p>

                        <p className="mt-1 text-[11px] text-emerald-300/60">
                          {orderCreated}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* PAY */}
              <motion.button
                type="button"
                onClick={handlePayment}
                disabled={creatingOrder}
                whileHover={
                  !creatingOrder
                    ? {
                        scale: 1.01,
                      }
                    : undefined
                }
                whileTap={
                  !creatingOrder
                    ? {
                        scale: 0.98,
                      }
                    : undefined
                }
                className={`mt-7 flex h-14 w-full items-center justify-between rounded-2xl px-5 text-sm font-semibold shadow-[0_10px_35px_rgba(255,255,255,.08)] transition ${
                  creatingOrder
                    ? "cursor-not-allowed bg-white/50 text-black/50"
                    : "bg-white text-black hover:bg-white/90"
                }`}
              >
                <span>
                  {creatingOrder
                    ? "Creating order..."
                    : `Pay ${currentCountry.currency} 999`}
                </span>

                <span className="text-lg">
                  {creatingOrder ? "..." : "→"}
                </span>
              </motion.button>

              {/* SECURITY */}
              <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
                    ✓
                  </div>

                  <div>
                    <p className="text-xs font-medium">
                      Secure payment
                    </p>

                    <p className="mt-1 text-[10px] leading-4 text-white/30">
                      Your payment is securely processed
                      through the selected payment provider.
                    </p>
                  </div>
                </div>
              </div>

              {/* SELECTED PAYMENT */}
              <AnimatePresence mode="wait">
                {selectedPayment && (
                  <motion.div
                    key={selectedPayment.id}
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                    }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 flex items-center justify-between text-[10px] text-white/25">
                      <span>
                        Selected payment
                      </span>

                      <span className="text-white/45">
                        {selectedPayment.name}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* TRUST */}
            <div className="mt-5 flex items-center justify-center gap-5 text-[9px] uppercase tracking-[0.18em] text-white/20">
              <span>Encrypted</span>
              <span>Verified</span>
              <span>Protected</span>
            </div>
          </motion.aside>
        </div>
      </div>
    </main>
  );
}