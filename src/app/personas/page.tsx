import Link from "next/link";
import { connection } from "next/server";
import { DeletePersonaButton } from "@/components/DeletePersonaButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPersonaRepository } from "@/lib/personas/getPersonaRepository";
import { NEW_PERSONA_PATH, personaEditPath, personaPlaygroundPath } from "@/lib/personas/paths";

const TEMPERATURE_DECIMALS = 2;

export default async function PersonasPage() {
  await connection();
  const personas = getPersonaRepository().list();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Personas</h1>
          <p className="max-w-2xl text-muted-foreground">
            Controle como a IA escreve: instrução de sistema, regras de tom, temperatura e exemplos
            de estilo de cada persona.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href={NEW_PERSONA_PATH}>Nova persona</Link>
        </Button>
      </header>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead className="text-right">Regras</TableHead>
              <TableHead className="text-right">Temperatura</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personas.map((persona) => (
              <TableRow key={persona.id}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {persona.name}
                    {persona.isBuiltin && <Badge variant="secondary">Padrão</Badge>}
                  </span>
                </TableCell>
                <TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell">
                  {persona.description}
                </TableCell>
                <TableCell className="text-right tabular-nums">{persona.toneParameters.length}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {persona.temperature.toFixed(TEMPERATURE_DECIMALS)}
                </TableCell>
                <TableCell>
                  <div className="flex items-start justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={personaPlaygroundPath(persona.id)}>Testar</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={personaEditPath(persona.id)}>Editar</Link>
                    </Button>
                    {!persona.isBuiltin && <DeletePersonaButton id={persona.id} name={persona.name} />}
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
