import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions";
import { MyNFTsList } from "@/components/my-nfts-list";

export default async function MyNFTsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My NFTs</h1>
        <p className="text-muted-foreground">
          View and manage your petition signature NFTs.
        </p>
      </div>

      <MyNFTsList userId={user.id} />
    </div>
  );
}
