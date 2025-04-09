import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PaginationButton } from "@/components/pagination-button"
import { listCauses } from "@/actions"

// Mock data for causes
const mockCauses = [
  {
    id: "1",
    title: "Clean Water Initiative",
    description: "Providing clean water to communities in rural areas.",
    category: "environment",
    raised: 12500,
    goal: 20000,
    image: "/placeholder.svg?height=200&width=400",
    created_at: "2023-05-15T10:30:00Z",
  },
  {
    id: "2",
    title: "Education for All",
    description: "Supporting education for underprivileged children.",
    category: "education",
    raised: 8700,
    goal: 15000,
    image: "/placeholder.svg?height=200&width=400",
    created_at: "2023-06-10T14:45:00Z",
  },
  {
    id: "3",
    title: "Medical Supplies Drive",
    description: "Collecting medical supplies for local clinics.",
    category: "health",
    raised: 5300,
    goal: 10000,
    image: "/placeholder.svg?height=200&width=400",
    created_at: "2023-07-05T09:15:00Z",
  },
  {
    id: "4",
    title: "Community Garden Project",
    description: "Creating a sustainable garden in our neighborhood.",
    category: "community",
    raised: 3200,
    goal: 5000,
    image: "/placeholder.svg?height=200&width=400",
    created_at: "2023-07-10T11:30:00Z",
  },
  {
    id: "5",
    title: "Disaster Relief Fund",
    description: "Providing emergency aid to affected communities.",
    category: "disaster",
    raised: 15000,
    goal: 25000,
    image: "/placeholder.svg?height=200&width=400",
    created_at: "2023-08-01T08:45:00Z",
  },
  {
    id: "6",
    title: "Animal Shelter Support",
    description: "Helping local animal shelters with supplies and care.",
    category: "animals",
    raised: 6800,
    goal: 12000,
    image: "/placeholder.svg?height=200&width=400",
    created_at: "2023-08-15T13:20:00Z",
  },
  {
    id: "7",
    title: "Renewable Energy Project",
    description: "Installing solar panels in underserved communities.",
    category: "environment",
    raised: 9500,
    goal: 18000,
    image: "/placeholder.svg?height=200&width=400",
    created_at: "2023-09-01T10:00:00Z",
  },
  {
    id: "8",
    title: "School Supplies Drive",
    description: "Collecting school supplies for children in need.",
    category: "education",
    raised: 4200,
    goal: 7500,
    image: "/placeholder.svg?height=200&width=400",
    created_at: "2023-09-10T15:30:00Z",
  },
  {
    id: "9",
    title: "Mental Health Awareness",
    description: "Promoting mental health awareness and support.",
    category: "health",
    raised: 7300,
    goal: 15000,
    image: "/placeholder.svg?height=200&width=400",
    created_at: "2023-09-20T09:45:00Z",
  },
  {
    id: "10",
    title: "Neighborhood Cleanup",
    description: "Organizing community cleanup events.",
    category: "community",
    raised: 2100,
    goal: 4000,
    image: "/placeholder.svg?height=200&width=400",
    created_at: "2023-10-01T14:15:00Z",
  },
  {
    id: "11",
    title: "Hurricane Relief",
    description: "Supporting families affected by recent hurricanes.",
    category: "disaster",
    raised: 18500,
    goal: 30000,
    image: "/placeholder.svg?height=200&width=400",
    created_at: "2023-10-10T11:00:00Z",
  },
  {
    id: "12",
    title: "Wildlife Conservation",
    description: "Protecting endangered species and their habitats.",
    category: "animals",
    raised: 8900,
    goal: 20000,
    image: "/placeholder.svg?height=200&width=400",
    created_at: "2023-10-20T16:30:00Z",
  },
]

interface CausesListProps {
  category: string
  page: number
  pageSize: number
}

export async function CausesList({ category, page, pageSize }: CausesListProps) {
  const causes = await listCauses({
    category: category === "all" ? undefined : category,
    limit: pageSize,
    offset: (page - 1) * pageSize
  })
  const filteredCauses = category === "all" ? causes : causes.filter((cause) => cause.category === category)

  const paginatedCauses = filteredCauses.slice((page - 1) * pageSize, page * pageSize)
  const totalCauses = filteredCauses.length
  const totalPages = Math.ceil(totalCauses / pageSize)

  if (paginatedCauses.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium">No causes found</h3>
        <p className="text-muted-foreground">Try selecting a different category or check back later.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedCauses.map((cause) => (
          <Card key={cause.id} className="overflow-hidden">
            <div className="aspect-video w-full overflow-hidden">
              <img src={cause.image || "/placeholder.svg"} alt={cause.title} className="object-cover w-full h-full" />
            </div>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">
                  {cause.category}
                </span>
              </div>
              <CardTitle className="line-clamp-1">{cause.title}</CardTitle>
              <CardDescription className="line-clamp-2">{cause.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">₦{cause.raised.toLocaleString()}</span>
                  <span className="text-muted-foreground">of ₦{cause.goal.toLocaleString()}</span>
                </div>
                <Progress value={(cause.raised / cause.goal) * 100} />
              </div>
            </CardContent>
            <CardFooter>
              <Link href={`/causes/${cause.id}`} className="w-full">
                <Button className="w-full">Donate Now</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-6">
          <PaginationButton currentPage={page} totalPages={totalPages} />
        </div>
      )}
    </div>
  )
}

