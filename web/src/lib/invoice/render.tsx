import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "./template";
import type { InvoiceData } from "./data";

/** Render an invoice/receipt to a PDF buffer. */
export async function renderInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />);
}
