import { redirect } from "next/navigation";

/** Saved addresses are now part of the consolidated "Profilul meu" page. */
export default function AddressesPage() {
  redirect("/account");
}
