"use client";

import { CommentsSection } from "./comment-section";
import { TabsContent } from "@/components/ui/tabs";
import { Comment } from "@/types/common-types";
import { useState } from "react";

interface CommentsTabWrapperProps {
  initialComments: Comment[];
  causeId: string;
  currentUserId?: string;
}

export function CommentsTabWrapper({
  initialComments,
  causeId,
  currentUserId,
}: CommentsTabWrapperProps) {
  const [commentCount, setCommentCount] = useState(initialComments.length);

  return (
    <TabsContent value="comments">
      <CommentsSection
        comments={initialComments}
        causeId={causeId}
        currentUserId={currentUserId}
        onCommentAdded={() => setCommentCount(prev => prev + 1)}
        onCommentDeleted={() => setCommentCount(prev => prev - 1)}
      />
    </TabsContent>
  );
}