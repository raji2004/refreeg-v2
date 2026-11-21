"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field-error";
import { emailTriggerColumns } from "@/components/admin/email/trigger-columns";
import { useEmailTriggers, useSetEmailTrigger } from "@/hooks/use-email-admin";
import { useToast } from "@/hooks/use-toast";
import { Small } from "@/components/marketing/Typography";

export function TriggersTable() {
  const { triggers, error, isLoading } = useEmailTriggers();
  const setTrigger = useSetEmailTrigger();
  const { toast } = useToast();

  const pendingKey = setTrigger.isPending ? setTrigger.variables.key : null;

  const columns = useMemo(
    () =>
      emailTriggerColumns({
        pendingKey,
        onToggle: (key, enabled) =>
          setTrigger.mutate(
            { key, enabled },
            {
              onSuccess: ({ success, error: reason }) => {
                if (!success) {
                  toast({ title: reason, variant: "destructive" });
                }
              },
              onError: (mutationError) =>
                toast({ title: mutationError.message, variant: "destructive" }),
            },
          ),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingKey],
  );

  if (error) return <FieldError message={error} />;
  if (!isLoading && triggers.length === 0) {
    return <EmptyState title="No notification events" />;
  }

  return (
    <Card>
      <CardContent className="p-2">
        <DataTable columns={columns} data={triggers} pageSize={20} />
        <Small className="block px-4 py-3">
          Required emails always send. Switches apply within a minute.
        </Small>
      </CardContent>
    </Card>
  );
}
