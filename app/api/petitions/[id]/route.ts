import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deletePetition } from "@/actions/petition-actions";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const petitionId = params.id;
    if (!petitionId) {
      return NextResponse.json({ error: "Petition ID required" }, { status: 400 });
    }

    // Verify the user owns this petition
    const { data: petition, error: fetchError } = await supabase
      .from("petitions")
      .select("user_id")
      .eq("id", petitionId)
      .single();

    if (fetchError || !petition) {
      return NextResponse.json({ error: "Petition not found" }, { status: 404 });
    }

    if (petition.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the petition
    await deletePetition(petitionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting petition:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
