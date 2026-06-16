import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import CreatePetitionForm from "./create-petition-form";

export default async function CreateCausePage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <div className="">
      <CreatePetitionForm />
    </div>
  );
}
