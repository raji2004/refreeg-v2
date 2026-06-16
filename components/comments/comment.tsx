"use client";

import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Comment } from "@/types/common-types";
import { ReplyForm } from "./reply-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { EditCommentForm } from "./edit-comment-form";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

interface CommentProps {
  comment: Comment;
  causeId: string;
  currentUserId?: string;
  onCommentDeleted: (commentId: string) => void;
  entityType?: "cause" | "petition";
}

export function CommentComponent({
  comment,
  causeId,
  currentUserId,
  onCommentDeleted,
  entityType,
}: CommentProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [repliesCount, setRepliesCount] = useState(comment.replies_count || 0);

  // Fetch replies when toggling showReplies to true
  const handleToggleReplies = async () => {
    if (!showReplies && replies.length === 0 && repliesCount > 0) {
      setIsLoadingReplies(true);
      try {
        const response = await fetch(
          `/api/comments/replies/${comment.id}?entityType=${
            entityType || "cause"
          }`,
        );
        if (response.ok) {
          const fetchedReplies = await response.json();
          setReplies(fetchedReplies);
        }
      } catch (error) {
        console.error("Failed to fetch replies:", error);
      } finally {
        setIsLoadingReplies(false);
      }
    }
    setShowReplies(!showReplies);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onCommentDeleted(comment.id);
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleEdit = async (content: string) => {
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const updatedComment = await response.json();
        setReplies(
          replies.map((r) => (r.id === updatedComment.id ? updatedComment : r)),
        );
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  };

  // Determine profile link behavior
  const getProfileLink = () => {
    const hasUsername = !!comment.user.username;
    const isCurrentUser = currentUserId === comment.user_id;

    // If current user doesn't have username, direct to settings
    if (isCurrentUser && !hasUsername) {
      return "/dashboard/settings";
    }

    // If other user doesn't have username, stay on current page (prevent navigation)
    if (!isCurrentUser && !hasUsername) {
      return "#";
    }

    // For users with usernames, use normal profile link
    return `/${comment.user.username}`;
  };

  const profileLink = getProfileLink();
  const hasUsername = !!comment.user.username;
  const isCurrentUser = currentUserId === comment.user_id;

  return (
    <div className="border-b pb-4 mb-4">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <Link
            href={profileLink}
            onClick={(e) => {
              // Prevent navigation for other users without username
              if (!isCurrentUser && !hasUsername) {
                e.preventDefault();
              }
            }}
          >
            {comment.user.profile_photo ? (
              <Image
                src={getMediaUrl(comment.user.profile_photo)}
                alt={comment.user.full_name || "User"}
                width={40}
                height={40}
                className="rounded-full"
                unoptimized={isProxyMediaUrl(
                  getMediaUrl(comment.user.profile_photo),
                )}
              />
            ) : (
              <div
                className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ${
                  !isCurrentUser && !hasUsername
                    ? "cursor-default"
                    : "cursor-pointer"
                }`}
              >
                <span className="text-sm font-medium">
                  {comment.user.full_name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            )}
          </Link>
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-2">
            <Link
              href={profileLink}
              onClick={(e) => {
                // Prevent navigation for other users without username
                if (!isCurrentUser && !hasUsername) {
                  e.preventDefault();
                }
              }}
              className={`font-medium ${
                !isCurrentUser && !hasUsername
                  ? "text-gray-500 cursor-default no-underline"
                  : "hover:underline"
              }`}
            >
              {comment.user.full_name || "Anonymous"}
              {isCurrentUser && !hasUsername && (
                <span
                  className="text-xs text-orange-600 ml-1"
                  title="Set up your username in settings"
                >
                  *
                </span>
              )}
              {!isCurrentUser && !hasUsername && (
                <span
                  className="text-xs text-gray-400 ml-1"
                  title="This user hasn't set up their profile"
                >
                  •
                </span>
              )}
            </Link>
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
              })}
              {comment.is_edited && (
                <sup className="text-xs text-muted-foreground ml-1">
                  (edited)
                </sup>
              )}
            </span>
          </div>

          {isEditing ? (
            <EditCommentForm
              initialContent={comment.content}
              onSave={handleEdit}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <p className="mt-1 text-sm">{comment.content}</p>
          )}

          <div className="mt-2 flex items-center gap-4">
            <button
              onClick={handleToggleReplies}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={isLoadingReplies}
            >
              {isLoadingReplies
                ? "Loading..."
                : repliesCount === 1
                  ? "1 reply"
                  : `${repliesCount} replies`}
            </button>

            {currentUserId === comment.user_id && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>

          {currentUserId && !isEditing && (
            <div className="mt-3">
              <ReplyForm
                causeId={causeId}
                parentId={comment.id}
                onReplyAdded={(newReply) => {
                  setReplies([...replies, newReply]);
                  setRepliesCount(repliesCount + 1);
                }}
                entityType={entityType}
              />
            </div>
          )}
        </div>
      </div>

      {showReplies && replies.length > 0 && (
        <div className="ml-12 mt-4 space-y-4 border-l-2 pl-4">
          {replies.map((reply) => (
            <CommentComponent
              key={reply.id}
              comment={reply}
              causeId={causeId}
              currentUserId={currentUserId}
              onCommentDeleted={(deletedId) => {
                setReplies(replies.filter((r) => r.id !== deletedId));
                setRepliesCount(repliesCount - 1);
              }}
              entityType={entityType}
            />
          ))}
        </div>
      )}
    </div>
  );
}
