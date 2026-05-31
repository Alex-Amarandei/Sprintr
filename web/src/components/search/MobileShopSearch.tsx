"use client";

import { ActionIcon, TextInput } from "@mantine/core";
import { Search, X } from "lucide-react";
import { useSearch } from "./SearchContext";

/** Mobile-only search box for the browse page (the header search is hidden below `sm`). */
export function MobileShopSearch() {
  const { query, setQuery } = useSearch();
  return (
    <TextInput
      hiddenFrom="sm"
      size="md"
      placeholder="Caută magazine…"
      leftSection={<Search size={16} />}
      rightSection={
        query ? (
          <ActionIcon variant="subtle" color="gray" onClick={() => setQuery("")} aria-label="Șterge căutarea">
            <X size={14} />
          </ActionIcon>
        ) : null
      }
      value={query}
      onChange={(e) => setQuery(e.currentTarget.value)}
    />
  );
}
