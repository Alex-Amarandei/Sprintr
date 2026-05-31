"use client";

import { createContext, useContext, useState } from "react";

interface SearchCtx {
  query: string;
  setQuery: (q: string) => void;
}

const SearchContext = createContext<SearchCtx | null>(null);

/** Holds the header search query, shared between the header input and the page lists. */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within a SearchProvider");
  return ctx;
}
