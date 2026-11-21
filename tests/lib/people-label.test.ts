/**
 * @jest-environment node
 */
import { peopleLabel } from "@/lib/email/people-label";

describe("peopleLabel", () => {
  it.each([
    [0, "0 people"],
    [1, "1 person"],
    [2, "2 people"],
    [3412, "3,412 people"],
  ])("%i -> %s", (count, label) => {
    expect(peopleLabel(count)).toBe(label);
  });
});
