import type { Metadata } from "next";
import { connection } from "next/server";
import { NewUserForm } from "@/components/team/NewUserForm";
import { UserRowActions } from "@/components/team/UserRowActions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/dal";
import { getUserRepository } from "@/lib/auth/getAuthRepositories";
import { formatDateTime } from "@/lib/usage/format";

export const metadata: Metadata = { title: "Equipe" };

export default async function TeamPage() {
  await connection();
  const admin = await requireAdmin();
  const users = getUserRepository().list();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
        <p className="max-w-3xl text-muted-foreground">
          Quem pode entrar no Magistral. Minutas, conversas, lotes e tarefas são de cada pessoa; personas,
          cláusulas e a biblioteca são compartilhadas pelo escritório.
        </p>
      </header>

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
                  <Badge variant={user.disabledAt ? "outline" : "secondary"}>
                    {user.disabledAt ? "Desativada" : "Ativa"}
                  </Badge>
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
    </main>
  );
}
