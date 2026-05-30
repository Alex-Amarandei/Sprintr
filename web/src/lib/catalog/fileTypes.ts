import { fileTypeValues, type FileTypeKey } from "./schema";

/** Display label + accept tokens (extensions + MIME) + extensions for each supported type. */
export const FILE_TYPES: Record<
  FileTypeKey,
  { label: string; accept: string; ext: string[] }
> = {
  pdf: { label: "PDF", accept: ".pdf,application/pdf", ext: ["pdf"] },
  word: {
    label: "Word",
    accept:
      ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: ["doc", "docx"],
  },
  excel: {
    label: "Excel",
    accept:
      ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: ["xls", "xlsx"],
  },
  image: {
    label: "Imagini (JPG/PNG)",
    accept: "image/jpeg,image/png,.jpg,.jpeg,.png",
    ext: ["jpg", "jpeg", "png"],
  },
  csv: { label: "CSV", accept: ".csv,text/csv", ext: ["csv"] },
};

export const FILE_TYPE_OPTIONS = fileTypeValues.map((k) => ({
  value: k,
  label: FILE_TYPES[k].label,
}));

const norm = (keys: FileTypeKey[]): FileTypeKey[] =>
  keys.length ? keys : [...fileTypeValues];

/** `accept` attribute for a FileInput given the item's allowed types. */
export function acceptAttr(keys: FileTypeKey[]): string {
  return norm(keys).map((k) => FILE_TYPES[k].accept).join(",");
}

/** Human list of allowed types, e.g. "PDF, Word, CSV". */
export function acceptedLabel(keys: FileTypeKey[]): string {
  return norm(keys).map((k) => FILE_TYPES[k].label).join(", ");
}

/** Whether an uploaded file matches one of the allowed types (by extension). */
export function fileAllowed(file: File, keys: FileTypeKey[]): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return norm(keys).some((k) => FILE_TYPES[k].ext.includes(ext));
}
