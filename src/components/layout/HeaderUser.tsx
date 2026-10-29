import { getUserProfile } from "@/lib/books/queries";
import { ProfileButton } from "./ProfileButton";

export async function HeaderUser() {
  const profile = await getUserProfile();
  if (!profile.name) return null;
  return <ProfileButton name={profile.name} displayName={profile.displayName} email={profile.email} />;
}
