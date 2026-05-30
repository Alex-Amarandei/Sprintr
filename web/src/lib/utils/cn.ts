import { clsx, type ClassValue } from "clsx";

// Generic className combiner. (tailwind-merge removed with the move to Mantine.)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
