import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { API_ENDPOINTS, ENDPOINT_GROUPS } from "./_data/endpoints";
import { API_MODELS } from "./_data/models";
import { EndpointCard } from "./_components/endpoint-card";
import { ApiDocsSidebar } from "./_components/api-docs-sidebar";
import { ModelCard } from "./_components/model-card";

export default async function ApiDocsPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check if user is admin or manager
  const roles = await prisma.role.findMany({
    where: { user_id: session.user.id }
  });

  const isAdminOrManager = roles.some(r => r.role === "admin" || r.role === "manager");

  if (!isAdminOrManager) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start relative">
      {/* Sidebar Navigation — sticky, scrolls naturally with the page */}
      <aside className="w-full md:w-56 lg:w-64 shrink-0 hidden md:block md:sticky md:top-8 md:self-start md:max-h-[calc(100vh-8rem)] md:overflow-y-auto md:pr-4 md:border-r md:border-slate-200">
        <ApiDocsSidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 pb-20 md:pl-2">
        {ENDPOINT_GROUPS.map((group) => (
          <section key={group} id={`group-${group}`} className="mb-12 scroll-mt-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6 pb-2 border-b border-slate-200">
              {group}
            </h2>
            
            <div className="space-y-4">
              {API_ENDPOINTS.filter(ep => ep.group === group).map(endpoint => (
                <EndpointCard key={endpoint.id} endpoint={endpoint} />
              ))}
            </div>
          </section>
        ))}

        <section id="group-Data Models" className="mb-12 scroll-mt-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6 pb-2 border-b border-slate-200">
            Data Models
          </h2>
          <div className="space-y-4">
            {API_MODELS.map(model => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
