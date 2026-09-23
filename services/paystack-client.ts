


interface PaystackConfig {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  reference?: string;
  callback?: (response: any) => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => {
        openIframe: () => void;
      };
    };
  }
}

export const initializePaystackPayment = (config: PaystackConfig) => {
  if (typeof window !== "undefined" && window.PaystackPop) {
    const handler = window.PaystackPop.setup({
      key: config.key,
      email: config.email,
      amount: config.amount,
      currency: config.currency || "NGN",
      reference: config.reference,
      callback: config.callback,
      onClose: config.onClose,
    });

    handler.openIframe();
  } else {
    console.error("Paystack script not loaded");
    throw new Error("Paystack payment system not available");
  }
};

export const loadPaystackScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window object not available"));
      return;
    }

    if (window.PaystackPop) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paystack script"));

    document.head.appendChild(script);
  });
};
