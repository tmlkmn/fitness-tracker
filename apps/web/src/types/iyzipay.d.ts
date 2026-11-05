// Minimal ambient types for the `iyzipay` SDK (ships no types). Only the
// subscription surface this project uses is declared.
declare module "iyzipay" {
  interface IyzipayConfig {
    apiKey: string;
    secretKey: string;
    uri: string;
  }

  interface IyzipayResult {
    status: "success" | "failure";
    errorMessage?: string;
    errorCode?: string;
    [key: string]: unknown;
  }

  type IyzipayCallback = (
    err: Error | null,
    result: IyzipayResult,
  ) => void;

  class Iyzipay {
    constructor(config: IyzipayConfig);
    subscriptionCheckoutForm: {
      initialize(
        request: Record<string, unknown>,
        cb: IyzipayCallback,
      ): void;
    };
    subscription: {
      cancel(request: Record<string, unknown>, cb: IyzipayCallback): void;
      search(request: Record<string, unknown>, cb: IyzipayCallback): void;
    };
    static LOCALE: { TR: string; EN: string };
    static CURRENCY: { TRY: string; USD: string; EUR: string };
    static SUBSCRIPTION_INITIAL_STATUS: { ACTIVE: string; PENDING: string };
  }

  export = Iyzipay;
}
