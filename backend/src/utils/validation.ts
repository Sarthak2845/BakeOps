import { z } from "zod";

// Money columns are Decimal(12, 2); anything larger overflows in Postgres.
export const MAX_MONEY = 9_999_999_999.99;
// Quantity columns are Decimal(10, 2).
export const MAX_QUANTITY = 99_999_999.99;

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export const moneySchema = z.coerce
  .number()
  .finite()
  .nonnegative()
  .max(MAX_MONEY, `Must be at most ${MAX_MONEY}`);

export const quantitySchema = z.coerce
  .number()
  .finite()
  .positive()
  .max(MAX_QUANTITY, `Must be at most ${MAX_QUANTITY}`);

export const dateSchema = z.coerce.date().refine(
  (d) => d.getUTCFullYear() >= MIN_YEAR && d.getUTCFullYear() <= MAX_YEAR,
  `Date must be between ${MIN_YEAR} and ${MAX_YEAR}`
);
