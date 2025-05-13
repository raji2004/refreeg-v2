// app/categories/[id]/page.tsx
import { listCauses } from "@/actions"
import CategoryCausesSection from "@/components/categoryBasedCauses"
import { getCategoryById } from "@/lib/categories"
import { notFound } from "next/navigation"
import type { Cause } from "@/types";


export default async function CategoryPage({ params }: { params: { id: string } }) {
  const { id: categoryId } = params
  const allCauses = await listCauses()

  const filteredCauses = allCauses.filter(cause => cause.category === categoryId)
  const category = getCategoryById(categoryId)

  if (!category) return notFound()

  return (
    <main className="py-8 px-4 md:px-8">
      {/* <h1 className="text-3xl font-bold mb-6 flex items-center">
        {category.icon}
        {category.name} Causes
      </h1> */}

      <CategoryCausesSection title={category.name} causes={filteredCauses as Cause[]} />
    </main>
  )
}
