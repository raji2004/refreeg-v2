import { csvText } from "@/lib/admin-workspace";

it("exports Unicode and quoted CSV cells while neutralizing formula prefixes", () => {
  expect(
    csvText([
      ["₦418.6M", 'Aisha, "AM"'],
      ["=SUM(A1)", "+12.4%", 612],
    ]),
  ).toBe('"₦418.6M","Aisha, ""AM"""\r\n"\'=SUM(A1)","\'+12.4%","612"');
});
