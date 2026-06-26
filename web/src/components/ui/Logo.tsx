import Image from "next/image";

/** The Sprintr brand mark (square icon). Vector → set a display height; width matches. */
export function Logo({ height = 48 }: { height?: number }) {
  return (
    <Image
      src="/logo.svg"
      alt="Sprintr"
      width={height}
      height={height}
      priority
      style={{ width: height, height: "auto", display: "block" }}
    />
  );
}
