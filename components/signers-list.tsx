import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Signature } from "@/types"



interface SignersListProps {
  signers: Signature[]
}

export function SignersList({ signers }: SignersListProps) {
  // Sort signers by date (most recent first)
  const sortedSigners = [...signers].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Recent Signers</h2>
      {sortedSigners.length === 0 ? (
        <p className="text-muted-foreground">No signatures yet. Be the first to sign!</p>
      ) : (
        <div className="space-y-4">
          {sortedSigners.map((signer) => (
            <Card key={signer.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {(() => {
                        const displayName = signer.is_anonymous ? "Anonymous" : (signer.name || "").trim() || "—";
                        if (displayName === "Anonymous") return "A";
                        const initials = displayName
                          .split(/\s+/)
                          .filter(segment => segment.length > 0)
                          .slice(0, 2)
                          .map(segment => segment.charAt(0))
                          .join("")
                          .toUpperCase()
                          .substring(0, 2);
                        return initials || "—";
                      })()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {signer.is_anonymous ? "Anonymous" : (signer.name || "").trim() || "—"}
                    </CardTitle>
                    <CardDescription>
                      {new Date(signer.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </div>
                  <div className="ml-auto">
                    <span className="font-bold">₦{signer.amount.toLocaleString()}</span>
                  </div>
                </div>
              </CardHeader>
              {signer.message && !signer.is_anonymous && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{signer.message}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

