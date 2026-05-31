import type { Item } from "./schema";
import { computeItemPrice, type Answers } from "./pricing";
import { defaultAnswers } from "./answers";

/** One line in the mixed cart (CLAUDE.md: order = N line items, each freezing answers). */
export interface CartLine {
  lineId: string;
  itemId: string;
  title: string;
  kind: "service" | "product";
  answers: Answers;
  total: number;
  /** Attached files, held in memory until checkout (uploaded to storage there). */
  files: File[];
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
  return {
    lineId: crypto.randomUUID(),
    itemId: item.id,
    title: item.title,
    kind: item.kind,
    answers,
    total: computeItemPrice(item, answers).total,
    files,
  };
}
