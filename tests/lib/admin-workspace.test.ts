import {
  csvText,
  formatChange,
  formatNaira,
  formatPercent,
} from "@/lib/admin-workspace";

it("formats compact naira, percentages and changes", () => {
  expect(formatNaira(418_600_000)).toBe("₦418.6M");
  expect(formatNaira(3_920_000_000)).toBe("₦3.9B");
  expect(formatNaira(640_000)).toBe("₦640k");
  expect(formatPercent(0.068)).toBe("6.8%");
  expect(formatChange(110, 100)).toEqual({ text: "+10%", negative: false });
  expect(formatChange(97, 100)).toEqual({ text: "−3%", negative: true });
  expect(formatChange(5, 0)).toBeUndefined();
});

it("exports Unicode and quoted CSV cells while neutralizing formula prefixes", () => {
  expect(
    csvText([
      ["₦418.6M", 'Aisha, "AM"'],
      ["=SUM(A1)", "+12.4%", 612],
    ]),
  ).toBe('"₦418.6M","Aisha, ""AM"""\r\n"\'=SUM(A1)","\'+12.4%","612"');
});
