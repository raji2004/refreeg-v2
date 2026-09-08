export function formatFundingGoalInput(value: string | number) {
  const rawValue = String(value);
  if (!rawValue) return "";

  const decimalIndex = rawValue.indexOf(".");
  const wholePart =
    decimalIndex === -1 ? rawValue : rawValue.slice(0, decimalIndex);
  const decimalPart =
    decimalIndex === -1 ? null : rawValue.slice(decimalIndex + 1);
  const formattedWholePart = wholePart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );

  return decimalPart === null
    ? formattedWholePart
    : `${formattedWholePart}.${decimalPart}`;
}

export function normalizeFundingGoalInput(value: string) {
  const normalizedValue = value.replace(/,/g, "");
  return /^\d*(?:\.\d{0,2})?$/.test(normalizedValue)
    ? normalizedValue
    : null;
}
