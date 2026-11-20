/** `1 person`, `3,412 people`. */
export const peopleLabel = (count: number) =>
  `${count.toLocaleString()} ${count === 1 ? "person" : "people"}`;
