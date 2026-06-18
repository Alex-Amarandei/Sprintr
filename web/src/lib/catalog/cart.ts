import type { Item } from "./schema";
import { computeItemPrice, type Answers } from "./pricing";
import { defaultAnswers } from "./answers";
import type { CartLineInput } from "./offers";
import type { FileTypeKey } from "./schema";

/** One line in the mixed cart (CLAUDE.md: order = N line items, each freezing answers). */
export interface CartLine {
  lineId: string;
  itemId: string;
  /** Item's category (for category-scoped offer previews). Optional for legacy stored carts. */
  categoryId?: string | null;
  title: string;
  kind: "service" | "product";
  answers: Answers;
  /** Multiplier quantity (for bx-gy offer previews). Optional for legacy stored carts. */
  quantity?: number;
  total: number;
  /** The item requires a file upload. Frozen on the line (serializable) so a reloaded cart — whose
   *  in-memory `files` were stripped on persist — can still detect a now-missing required file. */
  requiresUpload?: boolean;
  /** Shop's allowed file types (serializable) — enforced when (re-)attaching a file in the basket. */
  acceptedFileTypes?: FileTypeKey[];
  /** Attached files, held in memory until checkout (uploaded to storage there). */
  files: File[];
}

/** Map a cart line onto the offer engine's input shape (defaults cover legacy stored lines). */
export function toCartLineInput(line: CartLine): CartLineInput {
  return {
    lineId: line.lineId,
    itemId: line.itemId,
    categoryId: line.categoryId ?? null,
    quantity: line.quantity ?? 1,
    lineTotal: line.total,
  };
}

/** An item needs the config modal if it has fields or requires a file upload. */
export function needsConfiguration(item: Item): boolean {
  return item.fields.length > 0 || item.requires_upload;
}

/** Build a frozen cart line from an item + chosen answers. */
export function buildCartLine(
  item: Item,
  answers: Answers = defaultAnswers(item),
  files: File[] = []
): CartLine {
  const { total, quantity } = computeItemPrice(item, answers);
  return {
    lineId: crypto.randomUUID(),
    itemId: item.id,
    categoryId: item.category_id ?? null,
    title: item.title,
    kind: item.kind,
    answers,
    quantity,
    total,
    requiresUpload: item.requires_upload,
    acceptedFileTypes: item.accepted_file_types,
    files,
  };
}
