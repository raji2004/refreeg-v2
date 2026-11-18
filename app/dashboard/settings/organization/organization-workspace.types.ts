import type { getOrganizationWorkspace } from "@/actions/users/organization-actions";

export type Workspace = Extract<
  Awaited<ReturnType<typeof getOrganizationWorkspace>>,
  { success: true }
>["workspace"];
