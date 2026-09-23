import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Signature } from "@/types";

interface SignersListProps {
  signers: Signature[];
  petitionTitle: string;
}

export function SignersList({ signers, petitionTitle }: SignersListProps) {
  const totalAmount = signers.reduce(
    (sum, signer) => sum + (signer.amount || 0),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {totalAmount.toLocaleString()} raised for {petitionTitle}
        </CardTitle>
        <CardDescription>
          <p>Share the petition to help us reach our goal</p>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
