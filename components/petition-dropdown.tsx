'use client'

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Edit, Eye, MoreHorizontal, Trash } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

interface PetitionDropdownProps {
    petitionId: string
}

export function PetitionDropdown({ petitionId }: PetitionDropdownProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this petition? This action cannot be undone.')) {
            return;
        }
        
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/petitions/${petitionId}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete petition');
            }
            
            router.refresh();
        } catch (error) {
            console.error('Error deleting petition:', error);
            alert('Failed to delete petition. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-1 h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href={`/petitions/${petitionId}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Petition
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/dashboard/petitions/${petitionId}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Petition
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                    onClick={handleDelete} 
                    disabled={isDeleting}
                    className="text-destructive"
                >
                    <Trash className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete Petition'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
} 