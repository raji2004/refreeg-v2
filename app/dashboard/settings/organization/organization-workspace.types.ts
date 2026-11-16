import type { getOrganizationWorkspace } from "@/actions/organization-actions";

export type Workspace = Extract<
  Awaited<ReturnType<typeof getOrganizationWorkspace>>,
  { success: true }
>["workspace"];
