import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PADRAO, validarConfig, montarConfig, formVazio, formDeConfig, configUtilizavel, trocarModo, lerCaminho, escreverCaminho, estimarDuracao } from '../js/config.js';

const valida = (extra = {}) => ({
  modo: 'duplas',
  times: [{ membros: ['Ana', 'Beto'] }, { membros: ['Caio', 'Duda'] }],
  temas: ['futebol'],
  ...structuredClone(PADRAO),
  ...extra,
});

test('PADRAO tem os valores da spec', () => {
  assert.deepEqual(PADRAO, {
    voltas: 3, tempoLeitura: 10, tempoMimica: 90,
    mix: { facil: 1, medio: 1, dificil: 1 },
    pontos: { facil: 1, medio: 2, dificil: 4 },
    esconderItens: true,
  });
});

test('config válida não tem erros', () => {
  assert.deepEqual(validarConfig(valida()), []);
  assert.deepEqual(validarConfig(valida({ modo: 'individual', times: [{ membros: ['Ana'] }, { membros: ['Beto'] }] })), []);
});

test('mínimo de 2 jogadores / 2 duplas', () => {
  assert.ok(validarConfig(valida({ modo: 'individual', times: [{ membros: ['Ana'] }] })).includes('Precisa de pelo menos 2 jogadores — sozinho é só ensaio.'));
  assert.ok(validarConfig(valida({ times: [{ membros: ['Ana', 'Beto'] }] })).includes('Precisa de pelo menos 2 duplas — sem rival não tem graça.'));
});

test('nomes vazios ou dupla incompleta', () => {
  assert.ok(validarConfig(valida({ times: [{ membros: ['Ana', '  '] }, { membros: ['Caio', 'Duda'] }] })).includes('Faltou nome aí — ninguém joga anônimo 🕵️'));
  assert.ok(validarConfig(valida({ times: [{ membros: ['Ana'] }, { membros: ['Caio', 'Duda'] }] })).includes('Faltou nome aí — ninguém joga anônimo 🕵️'));
});

test('nomes repetidos ignorando caixa e espaços', () => {
  const erros = validarConfig(valida({ modo: 'individual', times: [{ membros: ['Ana'] }, { membros: [' ana '] }] }));
  assert.ok(erros.includes('Tem nome repetido. Põe um sobrenome ou apelido pra diferenciar.'));
});

test('pelo menos 1 tema', () => {
  assert.ok(validarConfig(valida({ temas: [] })).includes('Escolhe pelo menos 1 tema pra gente ter o que sortear.'));
});

test('limites do personalizado', () => {
  assert.ok(validarConfig(valida({ voltas: 0 })).includes('Voltas: de 1 a 10 (mais que isso ninguém aguenta).'));
  assert.ok(validarConfig(valida({ voltas: 11 })).includes('Voltas: de 1 a 10 (mais que isso ninguém aguenta).'));
  assert.ok(validarConfig(valida({ tempoMimica: 100 })).includes('Tempo de mímica: de 30 s a 5 min, de 15 em 15 s.'));
  assert.ok(validarConfig(valida({ tempoMimica: 315 })).includes('Tempo de mímica: de 30 s a 5 min, de 15 em 15 s.'));
  assert.ok(validarConfig(valida({ tempoLeitura: 4 })).includes('Tempo de leitura: de 5 a 30 s.'));
  assert.ok(validarConfig(valida({ mix: { facil: 4, medio: 0, dificil: 0 } })).includes('Itens por dificuldade: de 0 a 3.'));
  assert.ok(validarConfig(valida({ mix: { facil: 0, medio: 0, dificil: 0 } })).includes('Itens por vez: de 1 a 6 — sem item não tem mímica.'));
  assert.ok(validarConfig(valida({ pontos: { facil: 0, medio: 2, dificil: 3 } })).includes('Pontos por dificuldade: de 1 a 5.'));
  assert.deepEqual(validarConfig(valida({ voltas: 10, tempoMimica: 300, tempoLeitura: 30, mix: { facil: 3, medio: 0, dificil: 3 }, pontos: { facil: 5, medio: 5, dificil: 5 } })), []);
});

test('montarConfig: padrão ignora extras, personalizado usa extras, nomes sem espaços', () => {
  const form = formVazio();
  form.times = [{ membros: [' Ana ', 'Beto'] }, { membros: ['Caio', 'Duda'] }];
  form.temas = ['animal'];
  form.extras.voltas = 7;
  assert.equal(montarConfig(form).voltas, 3);
  assert.equal(montarConfig(form).times[0].membros[0], 'Ana');
  form.personalizado = true;
  assert.equal(montarConfig(form).voltas, 7);
});

test('formVazio: duplas, 2 duplas vazias, extras independentes do PADRAO', () => {
  const form = formVazio();
  assert.equal(form.modo, 'duplas');
  assert.deepEqual(form.times, [{ membros: ['', ''] }, { membros: ['', ''] }]);
  assert.equal(form.personalizado, false);
  form.extras.mix.facil = 3;
  assert.equal(PADRAO.mix.facil, 1);
});

test('formVazio: pré-seleciona os temas recebidos (cópia) e sem argumento fica vazio', () => {
  const ids = ['futebol', 'animal'];
  const form = formVazio(ids);
  assert.deepEqual(form.temas, ids);
  form.temas.push('x');
  assert.deepEqual(ids, ['futebol', 'animal']);
  assert.deepEqual(formVazio().temas, []);
});

test('nome longo (24 caracteres) é válido', () => {
  assert.deepEqual(validarConfig(valida({ modo: 'individual', times: [{ membros: ['Tio do Pavê Gonçalves'.padEnd(24, 'x')] }, { membros: ['Beto'] }] })), []);
});

test('formDeConfig detecta personalizado e faz ida e volta', () => {
  assert.equal(formDeConfig(valida()).personalizado, false);
  const custom = valida({ voltas: 5 });
  const form = formDeConfig(custom);
  assert.equal(form.personalizado, true);
  assert.deepEqual(montarConfig(form), custom);
});

test('trocarModo reaproveita os nomes', () => {
  const ind = { ...formVazio(), modo: 'individual', times: [{ membros: ['A'] }, { membros: ['B'] }, { membros: ['C'] }] };
  assert.deepEqual(trocarModo(ind, 'duplas').times, [{ membros: ['A', 'B'] }, { membros: ['C', ''] }]);
  const duplas = { ...formVazio(), times: [{ membros: ['A', 'B'] }, { membros: ['C', 'D'] }] };
  assert.deepEqual(trocarModo(duplas, 'individual').times.map((t) => t.membros[0]), ['A', 'B', 'C', 'D']);
  assert.deepEqual(trocarModo(formVazio(), 'individual').times, [{ membros: [''] }, { membros: [''] }]);
  const mesmo = formVazio();
  assert.equal(trocarModo(mesmo, 'duplas'), mesmo);
});

test('lerCaminho / escreverCaminho', () => {
  const o = { mix: { facil: 1 } };
  assert.equal(lerCaminho(o, 'mix.facil'), 1);
  escreverCaminho(o, 'mix.facil', 2);
  assert.equal(o.mix.facil, 2);
});

test('configUtilizavel aceita config válida e rejeita lixo salvo', () => {
  assert.equal(configUtilizavel(valida()), true);
  assert.equal(configUtilizavel(null), false);
  assert.equal(configUtilizavel('x'), false);
  assert.equal(configUtilizavel({ modo: 'duplas' }), false);
  assert.equal(configUtilizavel(valida({ mix: undefined })), false);
  assert.equal(configUtilizavel(valida({ times: [null, null] })), false);
  assert.equal(configUtilizavel(valida({ times: [{ membros: 'Ana' }, { membros: ['B'] }] })), false);
  assert.equal(configUtilizavel(valida({ temas: 'futebol' })), false);
  assert.equal(configUtilizavel(valida({ voltas: 99 })), false);
});

test('esconderItens: padrão escondido, personalizado pode mostrar', () => {
  const form = formVazio();
  form.times = [{ membros: ['Ana', 'Beto'] }, { membros: ['Caio', 'Duda'] }];
  form.temas = ['animal'];
  assert.equal(montarConfig(form).esconderItens, true);
  form.extras.esconderItens = false;
  assert.equal(montarConfig(form).esconderItens, true); // Padrão ignora extras
  form.personalizado = true;
  assert.equal(montarConfig(form).esconderItens, false);
});

test('esconderItens: só aceita booleano; config antiga sem o campo continua valendo', () => {
  assert.deepEqual(validarConfig(valida({ esconderItens: false })), []);
  assert.ok(validarConfig(valida({ esconderItens: 'sim' })).includes('Itens na mímica: escondidos ou à mostra.'));
  const antiga = valida();
  delete antiga.esconderItens;
  assert.deepEqual(validarConfig(antiga), []);
  assert.equal(configUtilizavel(antiga), true);
  const form = formDeConfig(antiga);
  assert.equal(form.personalizado, false);
  assert.equal(form.extras.esconderItens, true);
  assert.equal(montarConfig(form).esconderItens, true);
});

test('formDeConfig: itens à mostra conta como personalizado e faz ida e volta', () => {
  const custom = valida({ esconderItens: false });
  const form = formDeConfig(custom);
  assert.equal(form.personalizado, true);
  assert.deepEqual(montarConfig(form), custom);
});

test('estimarDuracao: vezes × (leitura + mímica + ~25 s de troca)', () => {
  // Padrão em duplas: 2 duplas × 2 × 3 voltas = 12 vezes × (10 + 90 + 25) s = 25 min
  assert.deepEqual(estimarDuracao(valida()), { vezes: 12, minutos: 25 });
  // 6 jogadores no Individual: 18 vezes × 125 s = 37,5 min → arredonda de 5 em 5
  const seis = valida({ modo: 'individual', times: ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => ({ membros: [n] })) });
  assert.deepEqual(estimarDuracao(seis), { vezes: 18, minutos: 40 });
  // Partida curta: minuto a minuto, nunca 0
  const curta = valida({ modo: 'individual', times: [{ membros: ['A'] }, { membros: ['B'] }], voltas: 1, tempoMimica: 30, tempoLeitura: 5 });
  assert.deepEqual(estimarDuracao(curta), { vezes: 2, minutos: 2 });
});

test('estimarDuracao: conta os slots mesmo com nome em branco', () => {
  assert.equal(estimarDuracao(montarConfig(formVazio(['futebol']))).vezes, 12);
});
