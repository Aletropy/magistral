import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthCard } from "@/components/auth/AuthCard";
import { SetupForm } from "@/components/auth/SetupForm";
import { DataPrivacyNotice } from "@/components/DataPrivacyNotice";
import { getUserRepository } from "@/lib/auth/getAuthRepositories";
import { LOGIN_PATH } from "@/lib/auth/paths";

export const metadata: Metadata = { title: "Configurar o Magistral" };

/** First run only: creates the admin, who then adds the rest of the office in Equipe. */
export default async function SetupPage() {
  await connection();
  if (getUserRepository().count() > 0) redirect(LOGIN_PATH);

  return (
    <AuthCard
      title="Configurar o Magistral"
      description="Crie a conta do administrador. Ela cadastra as demais pessoas do escritório e fica com as minutas e conversas feitas antes da configuração."
    >
      <DataPrivacyNotice />
      <SetupForm />
    </AuthCard>
  );
}
