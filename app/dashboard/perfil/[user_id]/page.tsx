import { PublicProfileDashboardScreen } from "@/components/redesign/LearningScreens";

export const metadata = {
  title: "Perfil | Pako Nihongo",
};

export default async function PublicPerfilDashboardPage({
  params,
}: {
  params: Promise<{ user_id: string }>;
}) {
  const { user_id } = await params;

  return <PublicProfileDashboardScreen userId={user_id} />;
}
