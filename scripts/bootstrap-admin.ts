// One-time creation of the first ADMIN account. Server-side only; there is no web flow for it.
//
//   npm run db:bootstrap-admin
//
// Input (no defaults):
//   BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME — environment or interactive prompt
//   BOOTSTRAP_ADMIN_PASSWORD                     — environment or HIDDEN interactive prompt
// Prefer the hidden prompt (keeps the password out of shell history). If environment variables
// are used, remove them right after the bootstrap. The password is never printed or logged.
// Refuses weak input and refuses to run when any account already exists.

import { createInterface } from "node:readline";
import { getPayload } from "payload";
import { bootstrapInputProblems, BootstrapRefused, createFirstAdmin } from "../src/backend/bootstrap.ts";

function ask(question: string, hidden = false): Promise<string> {
  if (!process.stdin.isTTY) return Promise.resolve("");
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
      out._writeToOutput = (s: string) => {
        if (s.startsWith(question)) out.output.write(question);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const email = process.env.BOOTSTRAP_ADMIN_EMAIL || (await ask("E-Mail des ersten Verwaltungskontos: "));
const name = process.env.BOOTSTRAP_ADMIN_NAME || (await ask("Anzeigename: "));
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || (await ask("Passwort (Eingabe unsichtbar): ", true));

const problems = bootstrapInputProblems({ email, name, password });
if (problems.length) {
  console.error(`Abgebrochen: ${problems.join(" ")}`);
  process.exit(1);
}

const { default: config } = await import("../payload.config.ts");
const payload = await getPayload({ config });
try {
  const { id } = await createFirstAdmin(payload, { email, name, password });
  console.log(`Erstes Verwaltungskonto angelegt (ID ${id}, Rolle ADMIN, aktiv). Passwort wird nicht angezeigt.`);
  if (process.env.BOOTSTRAP_ADMIN_PASSWORD) console.log("Bitte BOOTSTRAP_ADMIN_* jetzt aus der Umgebung entfernen.");
} catch (e) {
  console.error(e instanceof BootstrapRefused ? `Abgebrochen: ${e.message}` : "Abgebrochen: Konto konnte nicht angelegt werden.");
  process.exitCode = 1;
} finally {
  await payload.destroy();
}
process.exit(process.exitCode ?? 0);
