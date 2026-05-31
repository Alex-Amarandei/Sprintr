"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mantine/core";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getReorderPayload } from "@/lib/orders/actions";
import { useCart } from "@/components/cart/CartContext";

/** "Order again" — refills the cart from a past order and sends the customer to the shop. */
export function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { addLine, clear } = useCart();
  const [loading, setLoading] = useState(false);

  async function reorder() {
    setLoading(true);
    const p = await getReorderPayload(orderId);
    setLoading(false);
    if (!p || p.lines.length === 0) {
      toast.error("Nu am putut reconstrui comanda.");
      return;
    }
    clear();
    const shop = { id: p.shopId, name: p.shopName, open: p.shopOpen, deliveryFee: p.deliveryFee };
    for (const l of p.lines) {
      addLine(
        { lineId: crypto.randomUUID(), itemId: l.itemId, title: l.title, kind: l.kind, answers: l.answers, total: l.total, files: [] },
        shop
      );
    }
    toast.success("Produsele au fost adăugate în coș");
    router.push(`/shop/${p.shopId}`);
  }

  return (
    <Button variant="default" leftSection={<RotateCcw size={16} />} loading={loading} onClick={reorder}>
      Comandă din nou
    </Button>
  );
}
