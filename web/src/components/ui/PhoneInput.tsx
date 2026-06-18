"use client";

import { useMemo } from "react";
import { Group, Input, Select, TextInput, type ComboboxItem } from "@mantine/core";
import { sanitizePhoneInput } from "@/lib/utils/validation";

type Country = { iso: string; name: string; dial: string; flag: string };

// Romania first, then neighbours + frequent diaspora destinations. Extend as needed.
const COUNTRIES: Country[] = [
  { iso: "RO", name: "România", dial: "+40", flag: "🇷🇴" },
  { iso: "MD", name: "Moldova", dial: "+373", flag: "🇲🇩" },
  { iso: "IT", name: "Italia", dial: "+39", flag: "🇮🇹" },
  { iso: "ES", name: "Spania", dial: "+34", flag: "🇪🇸" },
  { iso: "DE", name: "Germania", dial: "+49", flag: "🇩🇪" },
  { iso: "FR", name: "Franța", dial: "+33", flag: "🇫🇷" },
  { iso: "GB", name: "Regatul Unit", dial: "+44", flag: "🇬🇧" },
  { iso: "AT", name: "Austria", dial: "+43", flag: "🇦🇹" },
  { iso: "BE", name: "Belgia", dial: "+32", flag: "🇧🇪" },
  { iso: "NL", name: "Olanda", dial: "+31", flag: "🇳🇱" },
  { iso: "HU", name: "Ungaria", dial: "+36", flag: "🇭🇺" },
  { iso: "BG", name: "Bulgaria", dial: "+359", flag: "🇧🇬" },
  { iso: "GR", name: "Grecia", dial: "+30", flag: "🇬🇷" },
  { iso: "PT", name: "Portugalia", dial: "+351", flag: "🇵🇹" },
  { iso: "IE", name: "Irlanda", dial: "+353", flag: "🇮🇪" },
  { iso: "PL", name: "Polonia", dial: "+48", flag: "🇵🇱" },
  { iso: "CH", name: "Elveția", dial: "+41", flag: "🇨🇭" },
  { iso: "UA", name: "Ucraina", dial: "+380", flag: "🇺🇦" },
  { iso: "RS", name: "Serbia", dial: "+381", flag: "🇷🇸" },
  { iso: "TR", name: "Turcia", dial: "+90", flag: "🇹🇷" },
  { iso: "US", name: "SUA / Canada", dial: "+1", flag: "🇺🇸" },
];

const DEFAULT = COUNTRIES[0]; // Romania

/** Split a stored full phone ("+40 712…") into a country + national number. */
function parsePhone(value: string): { country: Country; number: string } {
  const v = (value ?? "").trim();
  if (v) {
    const match = COUNTRIES.filter((c) => v.startsWith(c.dial)).sort(
      (a, b) => b.dial.length - a.dial.length,
    )[0];
    if (match) return { country: match, number: v.slice(match.dial.length).replace(/^\s+/, "") };
  }
  // No recognised prefix → treat the digits as the national part under the default country.
  return { country: DEFAULT, number: v.replace(/^\+/, "") };
}

/**
 * Phone field with a country-prefix dropdown (flag + dial code) next to the national number.
 * Controlled by a single combined string ("+40 712 345 678"). Searchable by country name even
 * though the collapsed control shows just the flag + code.
 */
export function PhoneInput({
  value,
  onChange,
  label = "Telefon de contact",
  placeholder = "7XX XXX XXX",
  required,
  error,
}: {
  value: string;
  onChange: (full: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: React.ReactNode;
}) {
  const { country, number } = useMemo(() => parsePhone(value), [value]);
  const byIso = useMemo(() => Object.fromEntries(COUNTRIES.map((c) => [c.iso, c])), []);
  const data = useMemo(() => COUNTRIES.map((c) => ({ value: c.iso, label: `${c.flag} ${c.dial}` })), []);

  const emit = (dial: string, nat: string) => onChange(`${dial} ${nat}`.trim());

  return (
    <Input.Wrapper label={label} required={required} error={error}>
      <Group gap="xs" wrap="nowrap" align="flex-start" mt={4}>
        <Select
          aria-label="Prefix țară"
          w={108}
          data={data}
          value={country.iso}
          searchable
          allowDeselect={false}
          checkIconPosition="right"
          comboboxProps={{ width: 260, position: "bottom-start" }}
          // Search by country name + dial code even though options show only the flag + code.
          filter={({ options, search }) => {
            const q = search.trim().toLowerCase();
            if (!q) return options;
            return (options as ComboboxItem[]).filter((o) => {
              const c = byIso[o.value];
              return (
                (c?.name.toLowerCase().includes(q) ?? false) ||
                (c?.dial.includes(q) ?? false) ||
                o.value.toLowerCase().includes(q)
              );
            });
          }}
          onChange={(iso) => emit((byIso[iso ?? "RO"] ?? DEFAULT).dial, number)}
        />
        <TextInput
          style={{ flex: 1 }}
          placeholder={placeholder}
          required={required}
          inputMode="tel"
          value={number}
          onChange={(e) => emit(country.dial, sanitizePhoneInput(e.currentTarget.value))}
        />
      </Group>
    </Input.Wrapper>
  );
}
