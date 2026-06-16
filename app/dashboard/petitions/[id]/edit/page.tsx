import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { getPetition } from "@/actions/petition-actions";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const EditPetitionForm = dynamic(() => import("./edit-petition-form"), {
  loading: () => <Skeleton className="h-[600px] w-full" />,
});

export default async function EditPetitionPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const myParams = await params;
  
  const [ session, petition ] = await Promise.all([
    auth(),
    getPetition(myParams.id)
  ]);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!petition) {
    redirect("/dashboard/petitions");
  }

  if (petition.user_id !== session.user.id) {
    redirect("/dashboard/petitions");
  }

  return (
    <div className="">
      <div className="md:mx-auto">
        <EditPetitionForm petition={petition} />
      </div>
    </div>
  );
}
