import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

test('compiled API imports emitted JavaScript and returns JSON without configuration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'engagement-api-'));
  try {
    await writeFile(join(directory, 'package.json'), '{"type":"module"}');
    for (const file of ['api/wishes.ts', 'src/server/wishes.ts']) {
      const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
      const compiled = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
        fileName: file,
      });
      const destination = join(directory, file.replace(/\.ts$/, '.js'));
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, compiled.outputText);
    }
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SECRET_KEY;
      const api = await import('./api/wishes.js');
      const response = await api.GET(new Request('https://example.test/api/wishes'));
      console.log(JSON.stringify({status: response.status, body: await response.json()}));
    `], { cwd: directory, encoding: 'utf8' });
    assert.deepEqual(JSON.parse(output), { status: 503, body: { error: {
      code: 'UNAVAILABLE', message: 'Buku ucapan belum dapat diakses. Silakan coba lagi.',
    } } });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
