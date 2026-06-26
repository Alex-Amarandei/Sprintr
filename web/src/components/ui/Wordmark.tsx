import Image from "next/image";

const RATIO = 2144 / 642; // wordmark.svg aspect ratio (w/h)

/** The "Sprintr" written logo. Vector → set a display height; width scales automatically. */
export function Wordmark({ height = 26 }: { height?: number }) {
  return (
    <Image
      src="/wordmark.svg"
      alt="Sprintr"
      height={height}
      width={Math.round(height * RATIO)}
      priority
      style={{ display: "block", height, width: "auto" }}
    />
  );
}
