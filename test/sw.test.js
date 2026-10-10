import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('..', import.meta.url).pathname;
const fonte = readFileSync(join(raiz, 'sw.js'), 'utf8');
const arquivos = JSON.parse(fonte.match(/const ARQUIVOS = (\[[\s\S]*?\]);/)[1]);

const listar = (dir) => readdirSync(join(raiz, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? listar(join(dir, e.name)) : [join(dir, e.name)]);

test('todo arquivo do cache existe', () => {
  for (const arquivo of arquivos.filter((a) => a !== './')) {
    assert.ok(existsSync(join(raiz, arquivo)), `${arquivo} não existe`);
  }
});

test('todo arquivo servido está no cache (offline completo)', () => {
  const servidos = ['index.html', 'manifest.json', ...['css', 'data', 'icons', 'js'].flatMap(listar)];
  for (const arquivo of servidos) assert.ok(arquivos.includes(arquivo), `${arquivo} fora do cache`);
});

test('caminhos relativos (site fica em /mimica/)', () => {
  assert.ok(arquivos.every((a) => !a.startsWith('/')));
});
