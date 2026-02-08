export const CATEGORIES = [
  "Furniture",
  "Delivery/Shipping",
  "Construction materials",
  "Labor/Contractors",
  "Electrical",
  "Plumbing",
  "Paint/Finishing",
  "Appliances",
  "Decor",
  "Tools",
  "Permits/Fees",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const formatEGP = (amount: number): string => {
  return `EGP ${amount.toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
