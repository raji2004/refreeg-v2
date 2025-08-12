"use client";

import { Comment } from "@/types/common-types";
import { CommentComponent } from "./comment";
import { CommentForm } from "./comment-form";
import { useState } from "react";

interface CommentsSectionProps {
  comments: Comment[];
  causeId: string;
  currentUserId?: string;
}

export function CommentsSection({ 
  comments, 
  causeId, 
  currentUserId 
}: CommentsSectionProps) {
  const [localComments, setLocalComments] = useState<Comment[]>(comments);

  const handleCommentAdded = (newComment: Comment) => {
    setLocalComments([newComment, ...localComments]);
  };

  const handleCommentUpdated = (updatedComment: Comment) => {
    setLocalComments(localComments.map(comment => 
      comment.id === updatedComment.id ? updatedComment : comment
    ));
  };

  const handleCommentDeleted = (deletedCommentId: string) => {
    setLocalComments(localComments.filter(comment => 
      comment.id !== deletedCommentId
    ));
  };

  return (
    <div className="space-y-6">
      {currentUserId && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Post a Comment</h3>
          <CommentForm 
            causeId={causeId} 
            onCommentAdded={handleCommentAdded} 
          />
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Comments</h3>
        
        {localComments.length > 0 ? (
          <div className="space-y-6">
            {localComments.map((comment) => (
              <CommentComponent
                key={comment.id}
                comment={comment}
                causeId={causeId}
                currentUserId={currentUserId}
                onCommentUpdated={handleCommentUpdated}
                onCommentDeleted={handleCommentDeleted}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No comments yet</p>
            {currentUserId && (
              <p className="text-sm text-muted-foreground mt-2">
                Be the first to share your thoughts
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}