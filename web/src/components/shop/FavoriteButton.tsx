"use client";

import { useState } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleFavorite } from "@/lib/favorites/actions";

/** Heart toggle to save a shop. Used on the storefront header and on browse cards (inside a
 *  Link → stops propagation so it doesn't navigate). */
export function FavoriteButton({
  shopId,
  initial,
  size = 20,
}: {
  shopId: string;
  initial: boolean;
  size?: number;
}) {
  const [fav, setFav] = useState(initial);
  const [pending, setPending] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    const prev = fav;
    setFav(!prev); // optimistic
    setPending(true);
    const res = await toggleFavorite(shopId);
    setPending(false);
    if (!res.ok) {
      setFav(prev);
      toast.error("Conectează-te pentru a salva magazine favorite.");
    }
  }

  return (
    <Tooltip label={fav ? "Elimină de la favorite" : "Adaugă la favorite"} withinPortal>
      <ActionIcon
        variant={fav ? "filled" : "white"}
        color={fav ? "red" : "gray"}
        radius="xl"
        size="lg"
        onClick={toggle}
        aria-label={fav ? "Elimină de la favorite" : "Adaugă la favorite"}
      >
        <Heart size={size} fill={fav ? "currentColor" : "none"} />
      </ActionIcon>
    </Tooltip>
  );
}
