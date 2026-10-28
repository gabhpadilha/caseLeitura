import { getUserName } from "@/lib/books/queries";

export async function HeaderUser() {
  const name = await getUserName();
  if (!name) return null;

  return (
    <span
      title={name}
      aria-label={name}
      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sage text-lg font-semibold text-white"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
