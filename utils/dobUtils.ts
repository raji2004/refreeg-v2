


export const getDays = () => Array.from({ length: 31 }, (_, i) => i + 1);


export const getMonths = () => [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];


export const getYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);
};


export const validateDOB = (day?: string, month?: string, year?: string) => {
  if (!day) return { field: "dobDay", error: "Day is required" };
  if (!month) return { field: "dobMonth", error: "Month is required" };
  if (!year) return { field: "dobYear", error: "Year is required" };

  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsedDate.getFullYear() !== Number(year) ||
    parsedDate.getMonth() !== Number(month) - 1 ||
    parsedDate.getDate() !== Number(day)
  ) {
    return { field: "dobDay", error: "Invalid date" };
  }

  return null;
};
