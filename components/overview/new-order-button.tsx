"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { Button } from "@/components/ui/button";
import type { Client } from "@/types/database";

export function NewOrderButton({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nouvelle commande
      </Button>
      <OrderFormDialog open={open} onOpenChange={setOpen} clients={clients} />
    </>
  );
}
