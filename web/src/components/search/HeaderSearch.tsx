"use client";

import { useEffect, useState } from "react";
import { TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { Search } from "lucide-react";
import { useSearch } from "@/components/search/SearchContext";

/** Header search box. Input updates instantly; the shared query is debounced (250ms). */
export function HeaderSearch() {
  const { setQuery } = useSearch();
  const [value, setValue] = useState("");
  const [debounced] = useDebouncedValue(value, 250);

  useEffect(() => {
    setQuery(debounced);
  }, [debounced, setQuery]);

  return (
    <TextInput
      flex={1}
      maw={420}
      visibleFrom="sm"
      mx="md"
      placeholder="Caută magazine în Iași..."
      leftSection={<Search size={16} />}
      value={value}
      onChange={(e) => setValue(e.currentTarget.value)}
    />
  );
}
