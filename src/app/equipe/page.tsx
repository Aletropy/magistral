import type { Metadata } from "next";
import { connection } from "next/server";
import { Page } from "@/components/layout/Page";
import { UnlockGate } from "@/components/auth/UnlockGate";
import { NewUserForm } from "@/components/team/NewUserForm";
import { UserRowActions } from "@/components/team/UserRowActions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/dal";
import { getUserRepository } from "@/lib/auth/getAuthRepositories";
import { isUnlocked } from "@/lib/auth/pin";
import { formatDateTime } from "@/lib/usage/format";

export const metadata: Metadata = { title: "Equipe" };

export default async function TeamPage() {
  await connection();
  const admin = await requireAdmin();
  if (!(await isUnlocked(admin.id))) {
    return (
      <Page title="Equipe" width="wide">
        <UnlockGate />
      </Page>
    );
  }
  const users = getUserRepository().list();

  return (
    <Page
      title="Equipe"
      width="wide"
      description={
        <>
          Quem pode entrar no Magistral. Minutas, conversas, lotes e tarefas são de cada pessoa; personas, cláusulas e a
          biblioteca são compartilhadas pelo escritório.
        </>
      }
    >
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pessoa</TableHead>
              <TableHead className="hidden md:table-cell">Situação</TableHead>
              <TableHead className="hidden md:table-cell">Cadastrada em</TableHead>
              <TableHead className="text-right">Acesso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="whitespace-normal">
                  <span className="font-medium">{user.displayName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {user.username}
                    {user.id === admin.id && " · você"}
                    <span className="md:hidden">{user.disabledAt && " · desativada"}</span>
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={user.disabledAt ? "outline" : "secondary"}>
                      {user.disabledAt ? "Desativada" : "Ativa"}
                    </Badge>
                    {user.hasPin && <Badge variant="outline">PIN</Badge>}
                  </div>
                </TableCell>
                <TableCell className="hidden tabular-nums md:table-cell">{formatDateTime(user.createdAt)}</TableCell>
                <TableCell>
                  <UserRowActions user={user} isSelf={user.id === admin.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <NewUserForm />
    </Page>
  );
}
