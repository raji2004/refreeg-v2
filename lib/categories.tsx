import { GraduationCap, HeartPulse, Leaf, Users, AlertTriangle, PawPrint } from "lucide-react"

export const categories = [
  { id: "education", name: "Education", icon: <GraduationCap className="mr-2 h-5 w-5" /> },
  { id: "health", name: "Healthcare", icon: <HeartPulse className="mr-2 h-5 w-5" /> },
  { id: "environment", name: "Environment", icon: <Leaf className="mr-2 h-5 w-5" /> },
  { id: "community", name: "Community", icon: <Users className="mr-2 h-5 w-5" /> },
  { id: "disaster", name: "Disaster Relief", icon: <AlertTriangle className="mr-2 h-5 w-5" /> },
  { id: "animals", name: "Animal Welfare", icon: <PawPrint className="mr-2 h-5 w-5" /> },
]

export function getCategoryById(id: string) {
  return categories.find((cat) => cat.id === id)
}
