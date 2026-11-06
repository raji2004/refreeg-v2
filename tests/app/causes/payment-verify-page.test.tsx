import { Suspense } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useQueryState } from "nuqs";
import { usePayment } from "@/hooks/use-payment";
import PaymentVerification from "@/app/causes/[id]/payment/verify/page";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

jest.mock("nuqs", () => ({
  useQueryState: jest.fn(),
}));

jest.mock("@/hooks/use-payment", () => ({
  usePayment: jest.fn(),
}));

jest.mock("@/actions/gift-actions", () => ({
  getGiftByReference: jest.fn(),
}));

jest.mock("@/components/giving/gift-success", () => ({
  GiftSuccess: () => <div>gift success</div>,
}));

const mockUseQueryState = useQueryState as jest.Mock;
const mockUsePayment = usePayment as jest.Mock;

function mockQuery(values: Record<string, string | null>) {
  mockUseQueryState.mockImplementation((key: string) => [values[key] ?? null]);
}

async function renderPage() {
  const params = Promise.resolve({ id: "cause-1" });
  await params;
  await act(async () => {
    render(
      <Suspense fallback={<div>loading page</div>}>
        <PaymentVerification params={params} />
      </Suspense>,
    );
  });
}

describe("payment verification page", () => {
  const verifyPayment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    verifyPayment.mockResolvedValue(false);
    mockUsePayment.mockReturnValue({ verifyPayment });
  });

  it("shows the failed screen for a Flutterwave cancel without calling verify", async () => {
    localStorage.setItem("payment_amount", "2500");
    mockQuery({
      tx_ref: "flw_cancelled",
      provider: "flutterwave",
      status: "cancelled",
    });

    await renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "Your payment didn't go through",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Flutterwave didn't confirm this payment/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/₦2[,.]?500/)).toBeInTheDocument();
    expect(verifyPayment).not.toHaveBeenCalled();
  });

  it("reads the pending Flutterwave amount from storage when the query has no provider", async () => {
    localStorage.setItem("payment_amount", "2500");
    localStorage.setItem("payment_provider", "flutterwave");
    mockQuery({
      tx_ref: "flw_cancelled",
      status: "cancelled",
    });

    await renderPage();

    expect(
      await screen.findByText(/Flutterwave didn't confirm this payment/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/₦2[,.]?500/)).toBeInTheDocument();
    expect(verifyPayment).not.toHaveBeenCalled();
  });

  it("still verifies when Flutterwave returns a reference without a cancel status", async () => {
    mockQuery({
      tx_ref: "flw_ok",
      provider: "flutterwave",
      status: "successful",
    });

    await renderPage();

    await waitFor(() => {
      expect(verifyPayment).toHaveBeenCalledWith(
        "flw_ok",
        "flutterwave",
        undefined,
      );
    });
  });

  it("does not verify when the return has no reference", async () => {
    mockQuery({});

    await renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "Your payment didn't go through",
      }),
    ).toBeInTheDocument();
    expect(verifyPayment).not.toHaveBeenCalled();
  });
});
