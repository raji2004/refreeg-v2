"use client";

import { CommentsSection } from "./comment-section";
import { TabsContent } from "@/components/ui/tabs";
import { Comment } from "@/types/common-types";
import { useState } from "react";

export function CommentsTabWrapper({
  initialComments,
  causeId,
  currentUserId,
}: {
  initialComments: Comment[];
  causeId: string;
  currentUserId?: string;
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentCount, setCommentCount] = useState(initialComments.length);

  const handleCommentAdded = (newComment: Comment) => {
    setComments((prev) => [newComment, ...prev]);
    setCommentCount((prev) => prev + 1);
  };

  const handleCommentDeleted = (deletedCommentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== deletedCommentId));
    setCommentCount((prev) => prev - 1);
  };

  return (
    <TabsContent value="comments" forceMount className="space-y-6">
      <CommentsSection
        comments={comments}
        causeId={causeId}
        currentUserId={currentUserId}
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
      />
    </TabsContent>
  );
}
