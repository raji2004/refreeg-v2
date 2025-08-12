import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const commentId = params.id; // Direct access is fine in Next.js 13.4+

    const { data: comment, error } = await supabase
      .from("comments")
      .update({
        content,
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .select(`
        *,
        user:profiles(full_name, profile_photo)
      `)
      .single();

    if (error) throw error;
    return NextResponse.json(comment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const commentId = params.id; // Direct access is fine in Next.js 13.4+

    // First check if comment belongs to user
    const { data: comment, error: checkError } = await supabase
      .from("comments")
      .select("user_id")
      .eq('id', commentId)
      .single();

    if (checkError) throw checkError;
    if (comment.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete all replies first
    await supabase.from("comments").delete().eq("parent_id", commentId);
    
    // Then delete the comment
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq('id', commentId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}