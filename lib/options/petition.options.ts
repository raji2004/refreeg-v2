import { categories } from "@/lib/categories";
import type { Option } from "@/types/options";

export const petitionCategoryOptions = categories.map(({ id, name }) => ({
  label: name,
  value: id,
})) satisfies Option[];
