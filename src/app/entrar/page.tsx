import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth/dal";
import { getUserRepository } from "@/lib/auth/getAuthRepositories";
import { NEXT_PATH_PARAM, SETUP_PATH, isSafeNextPath } from "@/lib/auth/paths";
import { HOME_PATH } from "@/lib/minutas/paths";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  await connection();
  if (getUserRepository().count() === 0) redirect(SETUP_PATH);
  if (await getCurrentUser()) redirect(HOME_PATH);
  const next = (await searchParams)[NEXT_PATH_PARAM];
  const nextPath = typeof next === "string" && isSafeNextPath(next) ? next : null;

  return (
    <AuthCard title="Entrar" description="Use o nome de acesso e a senha que o administrador do escritório criou para você.">
      <LoginForm nextPath={nextPath} />
    </AuthCard>
  );
}
