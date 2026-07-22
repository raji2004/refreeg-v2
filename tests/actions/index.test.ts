/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {},
}));

jest.mock("@/services/mail", () => ({}));

jest.mock("@/services/convertkit", () => ({}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as actions from "@/actions/index";

describe("actions/index", () => {
  it("re-exports key action modules", () => {
    expect(actions.getCurrentUser).toBeDefined();
    expect(actions.createCause).toBeDefined();
    expect(actions.signUpAction).toBeDefined();
    expect(actions.getUserRole).toBeDefined();
    expect(actions.recordEvent).toBeDefined();
    expect(actions.createPledge).toBeDefined();
    expect(actions.createSubscription).toBeDefined();
  });
});
