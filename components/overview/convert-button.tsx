"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { convertInboxToOrderAction } from "@/actions/inbox";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Transforme une demande en commande (action existante, sans ressaisie). */
export function ConvertButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await convertInboxToOrderAction(id);
            if (!result.ok) {
              setError(result.error ?? "Conversion impossible.");
              return;
            }
            if (result.orderId) router.push(`/orders/${result.orderId}`);
            else router.refresh();
          })
        }
      >
        {pending ? <Spinner className="size-3" /> : <ArrowRight className="size-3" />}
        Convertir
      </Button>
      {error ? (
        <span role="alert" className="text-[11px] text-danger">
          {error}
        </span>
      ) : null}
    </>
  );
}
