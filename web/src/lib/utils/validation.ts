// Shared form-field validators + input sanitizers. Pure functions → usable by both
// Mantine `useForm` validate maps and plain controlled inputs.

// Pragmatic email shape check (not full RFC 5322 — that's not worth it client-side).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Characters allowed in a phone number (digits + common formatting). */
const PHONE_ALLOWED_RE = /^[\d\s+().-]+$/;

/** Returns a Romanian error string, or `null` when the email is valid. */
export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Adresa de email este obligatorie";
  return EMAIL_RE.test(v) ? null : "Adresă de email invalidă";
}

/** Returns a Romanian error string, or `null` when the phone is valid. */
export function phoneError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Numărul de telefon este obligatoriu";
  if (!PHONE_ALLOWED_RE.test(v)) return "Numărul conține caractere nepermise";
  const digits = v.replace(/\D/g, "");
  if (digits.length < 10) return "Număr de telefon invalid";
  return null;
}

/** Strips characters not allowed in a phone number, for use in an onChange handler. */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d\s+().-]/g, "");
}
