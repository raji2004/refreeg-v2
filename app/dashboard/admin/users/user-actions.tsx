"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  UserCog,
  UserCheck,
  UserX,
  MoreHorizontal,
  Trash2,
  Loader2,
} from "lucide-react";
import { setUserRole } from "@/actions/role-actions";
import {
  blockUser,
  unblockUser,
  deleteUserAsAdmin,
} from "@/actions/user-actions";
import { UserWithRole } from "@/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface UserActionsProps {
  user: UserWithRole;
  currentUserRole: string;
}

type ActionType =
  "appoint_manager" | "remove_manager" | "block" | "unblock" | "delete";

export function UserActions({
  user: userItem,
  currentUserRole,
}: UserActionsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: ActionType | null;
    title: string;
    description: string;
    variant?: "default" | "destructive";
  }>({
    open: false,
    type: null,
    title: "",
    description: "",
    variant: "default",
  });

  const router = useRouter();

  const handleConfirm = async () => {
    if (!confirmDialog.type) return;

    setIsLoading(true);
    try {
      switch (confirmDialog.type) {
        case "appoint_manager":
          await setUserRole(userItem.id, "manager");
          toast({
            title: "Success",
            description: "User appointed as manager",
          });
          break;
        case "remove_manager":
          await setUserRole(userItem.id, "user");
          toast({
            title: "Success",
            description: "Manager role removed",
          });
          break;
        case "block":
          await blockUser(userItem.id);
          toast({
            title: "Success",
            description: "User blocked successfully",
          });
          break;
        case "unblock":
          await unblockUser(userItem.id);
          toast({
            title: "Success",
            description: "User unblocked successfully",
          });
          break;
        case "delete":
          const result = await deleteUserAsAdmin(userItem.id);
          if (result.error) {
            toast({
              title: "Error",
              description: result.error,
              variant: "destructive",
            });
            return;
          } else {
            toast({
              title: "Success",
              description: "User deleted successfully",
            });
          }
          break;
      }
      setConfirmDialog((prev) => ({ ...prev, open: false }));
      router.refresh();
    } catch (error) {
      console.error("Action error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppointManager = (email: string) => {
    setConfirmDialog({
      open: true,
      type: "appoint_manager",
      title: "Appoint Manager",
      description: `Are you sure you want to appoint ${email} as a manager? They will be able to approve/reject causes and block users.`,
      variant: "default",
    });
  };

  const handleRemoveManager = (email: string) => {
    setConfirmDialog({
      open: true,
      type: "remove_manager",
      title: "Remove Manager",
      description: `Are you sure you want to remove ${email} as a manager? They will no longer be able to perform administrative actions.`,
      variant: "default",
    });
  };

  const handleBlockUser = (email: string) => {
    setConfirmDialog({
      open: true,
      type: "block",
      title: "Block User",
      description: `Are you sure you want to block ${email}? They will no longer be able to log in or use the platform.`,
      variant: "destructive",
    });
  };

  const handleUnblockUser = (email: string) => {
    setConfirmDialog({
      open: true,
      type: "unblock",
      title: "Unblock User",
      description: `Are you sure you want to unblock ${email}? They will be able to log in and use the platform again.`,
      variant: "default",
    });
  };

  const handleDeleteUser = (email: string) => {
    setConfirmDialog({
      open: true,
      type: "delete",
      title: "Delete User",
      description: `Are you sure you want to PERMANENTLY delete ${email}? This action cannot be undone. All user data (profile, roles, KYC) will be wiped from the database.`,
      variant: "destructive",
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>

          {currentUserRole === "admin" && userItem.role !== "admin" && (
            <>
              {userItem.role === "manager" ? (
                <DropdownMenuItem
                  onClick={() => handleRemoveManager(userItem.email)}
                >
                  <User className="mr-2 h-4 w-4" />
                  Remove Manager Role
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => handleAppointManager(userItem.email)}
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Appoint as Manager
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}

          {userItem.role !== "admin" && (
            <>
              {userItem.is_blocked ? (
                <DropdownMenuItem
                  onClick={() => handleUnblockUser(userItem.email)}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Unblock User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => handleBlockUser(userItem.email)}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Block User
                </DropdownMenuItem>
              )}
            </>
          )}

          {(currentUserRole === "admin" || currentUserRole === "manager") &&
            userItem.role !== "admin" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteUser(userItem.email)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </DropdownMenuItem>
              </>
            )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.variant || "default"}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
