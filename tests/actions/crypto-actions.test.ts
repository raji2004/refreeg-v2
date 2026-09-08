/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    crypto_donations: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/actions/event-reward-actions", () => ({
  recordEvent: jest.fn(),
}));

jest.mock("@/lib/event-bus", () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/actions/event-reward-actions";
import { createCryptoDonation } from "@/actions/crypto-actions";

const mockPrisma = prisma as unknown as {
  crypto_donations: { create: jest.Mock };
  $transaction: jest.Mock;
};

describe("crypto-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (recordEvent as jest.Mock).mockResolvedValue({});
  });

  describe("createCryptoDonation", () => {
    it("creates crypto donation and increments cause raised", async () => {
      const donation = {
        id: "crypto-don-1",
        cause_id: "cause-1",
        amount_in_naira: 50000,
        amount_in_crypto: 0.5,
        status: "completed",
        tx_signature: "sig-123",
        network: "solana",
        currency: "SOL",
      };

      mockPrisma.$transaction.mockImplementation(async (callback) =>
        callback({
          crypto_donations: {
            create: jest.fn().mockResolvedValue(donation),
          },
          cause: {
            update: jest.fn().mockResolvedValue({}),
          },
        }),
      );

      const result = await createCryptoDonation({
        cause_id: "cause-1",
        user_id: "user-1",
        amount_in_naira: 50000,
        amount_in_crypto: 0.5,
        status: "completed",
        tx_hash: "",
        tx_signature: "sig-123",
        recipient_address: "sol-wallet",
        network: "solana",
        currency: "SOL",
      });

      expect(result).toEqual(donation);
      expect(recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "donation",
          userId: "user-1",
          amount: 50000,
          metadata: expect.objectContaining({ is_crypto: true }),
        }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/causes/cause-1");
    });

    it("does not record event for guest donations", async () => {
      const donation = {
        id: "crypto-don-2",
        cause_id: "cause-1",
        amount_in_naira: 10000,
        amount_in_crypto: 0.1,
        status: "completed",
        tx_signature: "sig-456",
        network: "polygon",
        currency: "MATIC",
      };

      mockPrisma.$transaction.mockImplementation(async (callback) =>
        callback({
          crypto_donations: {
            create: jest.fn().mockResolvedValue(donation),
          },
          cause: {
            update: jest.fn().mockResolvedValue({}),
          },
        }),
      );

      await createCryptoDonation({
        cause_id: "cause-1",
        user_id: null,
        amount_in_naira: 10000,
        amount_in_crypto: 0.1,
        status: "completed",
        tx_signature: "sig-456",
        recipient_address: "0xABC",
        network: "polygon",
        currency: "MATIC",
      });

      expect(recordEvent).not.toHaveBeenCalled();
    });
  });
});
