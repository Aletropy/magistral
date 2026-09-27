import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { DeletePersonaButton } from "@/components/DeletePersonaButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import {
  NEW_PERSONA_PATH,
  STYLE_CAPTURE_PATH,
  personaEditPath,
  personaPlaygroundPath,
} from "@/lib/personas/paths";
import { requireUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/types";

export const metadata: Metadata = { title: "Personas" };

const TEMPERATURE_DECIMALS = 2;

export default async function PersonasPage() {
  await connection();
  const user = await requireUser();
  const personas = getPersonaRepository().list();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Personas</h1>
          <p className="max-w-2xl text-muted-foreground">
            Controle como a IA escreve: instrução, regras de tom, termos proibidos, criatividade e
            exemplos de estilo de cada persona.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg" variant="outline">
            <Link href={STYLE_CAPTURE_PATH}>Capturar estilo de documento</Link>
          </Button>
          <Button asChild size="lg">
            <Link href={NEW_PERSONA_PATH}>Nova persona</Link>
          </Button>
        </div>
      </header>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead className="hidden text-right md:table-cell">Regras</TableHead>
              <TableHead className="hidden text-right md:table-cell">Criatividade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personas.map((persona) => (
              <TableRow key={persona.id}>
                <TableCell className="whitespace-normal font-medium">
                  <span className="flex flex-wrap items-center gap-2">
                    {persona.name}
                    {persona.isBuiltin && <Badge variant="secondary">Padrão</Badge>}
                  </span>
                  {persona.description && (
                    <span className="mt-1 block text-xs font-normal text-muted-foreground md:hidden">
                      {persona.description}
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell">
                  {persona.description}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums md:table-cell">{persona.toneParameters.length}</TableCell>
                <TableCell className="hidden text-right tabular-nums md:table-cell">
                  {persona.temperature.toFixed(TEMPERATURE_DECIMALS)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-start justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={personaPlaygroundPath(persona.id)}>Testar</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={personaEditPath(persona.id)}>Editar</Link>
                    </Button>
                    {!persona.isBuiltin && isAdmin(user) && <DeletePersonaButton id={persona.id} name={persona.name} />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
