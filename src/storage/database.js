// src/storage/database.js
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// ===== util de log =====
const LOG_SQL = true;
const log = (...a) => { if (LOG_SQL) console.log('[db]', ...a); };
const errStr = (e) => {
  if (!e) return '<<undefined error>>';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return `${e.name}: ${e.message}\n${e.stack ?? ''}`;
  try { return JSON.stringify(e); } catch { return String(e); }
};

// ---------- DB em memória (fallback) ----------
const makeMemoryDb = () => {
  const mem = {
    comandas: new Map(),         // id -> { id, nome, status, updated_at }
    itens: new Map(),            // id -> { id, comanda_id, produto, qtd, preco_unit, obs, updated_at }
    produtosById: new Map(),     // id -> { id, nome, preco, updated_at }
    produtoNameToId: new Map(),  // nome(lower) -> id
    autoCid: 1,
    autoIid: 1,
    autoPid: 1,
  };

  const txStub = {}; // imita o objeto tx do expo-sqlite
  const okWrap = (ok, payload = {}) =>
    ok?.(txStub, { rows: { _array: [] }, rowsAffected: 0, insertId: undefined, ...payload });
  const errWrap = (err, e) => err?.(txStub, e ?? new Error('memdb error'));

  const api = {
    exec(sql, params = [], ok, err) {
      try {
        const S = (sql || '').trim();
        const U = S.toUpperCase();
        log('MEM exec:', S, 'params:', params);

        // CREATE / INDEX / UPDATE default
        if (U.startsWith('CREATE TABLE') || U.startsWith('CREATE INDEX'))
          return okWrap(ok);
        if (U.startsWith("UPDATE COMANDAS SET STATUS = 'ABERTA' WHERE STATUS IS NULL"))
          return okWrap(ok);

        // ===== COMANDAS =====
        if (U.startsWith('INSERT INTO COMANDAS')) {
          // suportar ambas as formas BEM-FORMADAS:
          // (nome,status) VALUES (?, 'aberta')
          // (nome,status,updated_at) VALUES (?, 'aberta', datetime('now'))
          const nome = params[0];
          const id = mem.autoCid++;
          mem.comandas.set(id, { id, nome, status: 'aberta', updated_at: new Date().toISOString() });
          return okWrap(ok, { insertId: id, rowsAffected: 1 });
        }
        if (U.startsWith("UPDATE COMANDAS SET STATUS = 'FECHADA'")) {
          const id = Number(params[0]);
          const c = mem.comandas.get(id);
          if (c) {
            c.status = 'fechada';
            c.updated_at = new Date().toISOString();
          }
          return okWrap(ok, { rowsAffected: c ? 1 : 0 });
        }
        if (U.startsWith('SELECT * FROM COMANDAS WHERE ID = ?')) {
          const id = Number(params[0]);
          const c = mem.comandas.get(id);
          return ok?.(txStub, { rows: { _array: c ? [c] : [] } });
        }
        if (U.startsWith("SELECT * FROM COMANDAS WHERE STATUS = 'ABERTA' ORDER BY NOME COLLATE NOCASE ASC")) {
          const arr = Array.from(mem.comandas.values())
            .filter(c => c.status === 'aberta')
            .sort((a, b) => String(a.nome||'').localeCompare(String(b.nome||''), undefined, { sensitivity: 'base' }));
          return ok?.(txStub, { rows: { _array: arr } });
        }

        // ===== ITENS =====
        if (U.startsWith('INSERT INTO ITENS')) {
          const [comanda_id, produto, qtd, preco_unit, obs] = params;
          const id = mem.autoIid++;
          mem.itens.set(id, {
            id, comanda_id, produto, qtd, preco_unit, obs,
            updated_at: new Date().toISOString(),
          });
          return okWrap(ok, { insertId: id, rowsAffected: 1 });
        }
        if (U.startsWith('DELETE FROM ITENS WHERE ID = ?')) {
          const id = Number(params[0]);
          const okDel = mem.itens.delete(id);
          return okWrap(ok, { rowsAffected: okDel ? 1 : 0 });
        }
        if (U.startsWith('SELECT * FROM ITENS WHERE COMANDA_ID = ? ORDER BY ID ASC')) {
          const cid = Number(params[0]);
          const arr = Array.from(mem.itens.values())
            .filter(i => i.comanda_id === cid)
            .sort((a, b) => a.id - b.id);
          return ok?.(txStub, { rows: { _array: arr } });
        }

        // ===== PRODUTOS =====
        if (U.startsWith('INSERT INTO PRODUTOS')) {
          const [nome, preco] = params;
          const key = String(nome || '').toLowerCase();
          // se já existir pelo nome, atualiza preço
          if (mem.produtoNameToId.has(key)) {
            const id = mem.produtoNameToId.get(key);
            const p = mem.produtosById.get(id);
            p.preco = Number(preco) || 0;
            p.updated_at = new Date().toISOString();
            mem.produtosById.set(id, p);
            return okWrap(ok, { rowsAffected: 1, insertId: undefined });
          }
          const id = mem.autoPid++;
          const p = { id, nome, preco: Number(preco) || 0, updated_at: new Date().toISOString() };
          mem.produtosById.set(id, p);
          mem.produtoNameToId.set(key, id);
          return okWrap(ok, { insertId: id, rowsAffected: 1 });
        }

        if (U.startsWith('UPDATE PRODUTOS SET PRECO = ? WHERE ID = ?')) {
          const [preco, id] = params;
          const p = mem.produtosById.get(Number(id));
          if (p) {
            p.preco = Number(preco) || 0;
            p.updated_at = new Date().toISOString();
            mem.produtosById.set(p.id, p);
            return okWrap(ok, { rowsAffected: 1 });
          }
          return okWrap(ok, { rowsAffected: 0 });
        }
        if (U.startsWith('UPDATE PRODUTOS SET NOME = ?, PRECO = ? WHERE ID = ?')) {
          const [nome, preco, id] = params;
          const pid = Number(id);
          const old = mem.produtosById.get(pid);
          if (!old) return okWrap(ok, { rowsAffected: 0 });
          mem.produtoNameToId.delete(String(old.nome).toLowerCase());
          mem.produtoNameToId.set(String(nome).toLowerCase(), pid);
          mem.produtosById.set(pid, { id: pid, nome, preco: Number(preco) || 0, updated_at: new Date().toISOString() });
          return okWrap(ok, { rowsAffected: 1 });
        }

        if (U.startsWith('DELETE FROM PRODUTOS WHERE ID = ?')) {
          const id = Number(params[0]);
          const old = mem.produtosById.get(id);
          if (!old) return okWrap(ok, { rowsAffected: 0 });
          mem.produtosById.delete(id);
          mem.produtoNameToId.delete(String(old.nome).toLowerCase());
          return okWrap(ok, { rowsAffected: 1 });
        }

        if (U.startsWith('SELECT * FROM PRODUTOS ORDER BY NOME')) {
          const arr = Array.from(mem.produtosById.values())
            .sort((a, b) => a.nome.localeCompare(b.nome, undefined, { sensitivity: 'base' }));
          return ok?.(txStub, { rows: { _array: arr } });
        }
        if (U.startsWith('SELECT ID, NOME, PRECO FROM PRODUTOS WHERE NOME LIKE')) {
          const like = (params[0] || '').replace(/%/g, '').toLowerCase();
          const arr = Array.from(mem.produtosById.values())
            .filter(p => p.nome.toLowerCase().includes(like))
            .sort((a, b) => a.nome.localeCompare(b.nome, undefined, { sensitivity: 'base' }))
            .slice(0, 8);
          return ok?.(txStub, { rows: { _array: arr } });
        }
        if (U.startsWith('SELECT ID FROM PRODUTOS WHERE NOME = ?')) {
          const nome = String(params[0] || '');
          const id = mem.produtoNameToId.get(nome.toLowerCase());
          return ok?.(txStub, { rows: { _array: id ? [{ id }] : [] } });
        }
        if (U.startsWith('SELECT PRECO FROM PRODUTOS WHERE NOME = ?')) {
          const nome = String(params[0] || '');
          const id = mem.produtoNameToId.get(nome.toLowerCase());
          if (!id) return ok?.(txStub, { rows: { _array: [] } });
          const p = mem.produtosById.get(id);
          return ok?.(txStub, { rows: { _array: p ? [{ preco: p.preco }] : [] } });
        }

        if (U.startsWith('DROP TABLE')) return okWrap(ok, { rowsAffected: 1 });

        log('MEM exec (sem match, retornando vazio):', S);
        return okWrap(ok);
      } catch (e) {
        console.log('[db] MEM exec error:', errStr(e));
        return errWrap(err, e);
      }
    },
    transaction(fn) {
      const tx = { executeSql: (sql, params, ok, err) => api.exec(sql, params, ok, err) };
      fn(tx);
    },
  };

  return { transaction: api.transaction };
};

// ---------- expo-sqlite ----------
let _sqliteMod = undefined;
function getSQLiteModule() {
  if (_sqliteMod !== undefined) return _sqliteMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-sqlite');
    _sqliteMod = mod ?? null;
  } catch {
    _sqliteMod = null;
  }
  return _sqliteMod;
}

function resolveOpenFn(mod) {
  if (!mod) return { fn: null, kind: 'none' };
  const candidates = [
    mod.openDatabase,               // legacy
    mod.default?.openDatabase,      // legacy via default
    mod.openDatabaseSync,           // sync
    mod.default?.openDatabaseSync,  // sync via default
  ];
  for (const f of candidates) {
    if (typeof f === 'function') {
      const kind =
        f === mod.openDatabase || f === mod.default?.openDatabase
          ? 'legacy'
          : 'sync';
      return { fn: f, kind };
    }
  }
  return { fn: null, kind: 'none' };
}

// ---------- instância única ----------
let _db = null;
let _dbKind = 'unknown'; // 'legacy' | 'sync'

export function getDb() {
  if (_db) return _db;

  if (isWeb) {
    console.warn('[database] Web: usando banco em memória.');
    _db = makeMemoryDb();
    _dbKind = 'legacy';
    return _db;
  }

  const mod = getSQLiteModule();
  const { fn: openFn, kind } = resolveOpenFn(mod);

  if (!openFn) {
    console.warn('[database] expo-sqlite indisponível; usando banco em memória.');
    _db = makeMemoryDb();
    _dbKind = 'legacy';
    return _db;
  }

  if (kind === 'legacy') {
    console.log('[db] Abrindo SQLite (openDatabase legacy) kitutes.db');
    _db = openFn('kitutes.db');
    _dbKind = 'legacy';
    return _db;
  }

  console.log('[db] Abrindo SQLite (openDatabaseSync) kitutes.db');
  _db = openFn('kitutes.db'); // objeto com getAllSync/runSync
  _dbKind = 'sync';
  return _db;
}

// ---------- wrappers Promise ----------
export const dbSelectAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    const t0 = Date.now();
    const db = getDb();

    if (_dbKind === 'sync' && typeof db.getAllSync === 'function') {
      try {
        const arr = db.getAllSync(sql, params);
        log('OK SELECT', (Date.now() - t0) + 'ms', sql, '=>', Array.isArray(arr) ? arr.length : 0, 'linhas');
        resolve(arr ?? []);
      } catch (e) {
        console.log('ERRO SELECT(sync):', errStr(e), '\nSQL:', sql, '\nPARAMS:', params);
        reject(e);
      }
      return;
    }

    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, { rows }) => {
          const arr = rows?._array ?? [];
          log('OK SELECT', (Date.now()-t0)+'ms', sql, '=>', arr.length, 'linhas');
          resolve(arr);
        },
        (_, e) => {
          console.log('ERRO SELECT:', errStr(e), '\nSQL:', sql, '\nPARAMS:', params);
          reject(e);
          return true;
        }
      );
    });
  });

export const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    const t0 = Date.now();
    const db = getDb();

    if (_dbKind === 'sync' && typeof db.runSync === 'function') {
      try {
        const res = db.runSync(sql, params); // { changes/rowsAffected, lastInsertRowid/insertId }
        const payload = {
          insertId: res?.insertId ?? res?.lastInsertRowid,
          rowsAffected: res?.rowsAffected ?? res?.changes,
        };
        log('OK RUN   ', (Date.now() - t0) + 'ms', sql, '=>', payload);
        resolve(payload);
      } catch (e) {
        console.log('ERRO RUN(sync):', errStr(e), '\nSQL:', sql, '\nPARAMS:', params);
        reject(e);
      }
      return;
    }

    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, res) => {
          log('OK RUN   ', (Date.now()-t0)+'ms', sql, '=>', { insertId: res?.insertId, rowsAffected: res?.rowsAffected });
          resolve(res);
        },
        (_, e) => {
          console.log('ERRO RUN  :', errStr(e), '\nSQL:', sql, '\nPARAMS:', params);
          reject(e);
          return true;
        }
      );
    });
  });

// ---------- init schema ----------
export async function initDb() {
  const ensureColumn = async (table, column, typeSql, defaultSql = null) => {
    const cols = await dbSelectAll(`PRAGMA table_info(${table});`);
    const exists = cols?.some?.(c => String(c?.name).toLowerCase() === String(column).toLowerCase());
    if (!exists) {
      await dbRun(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql}${defaultSql ? ` DEFAULT ${defaultSql}` : ''};`);
    }
  };

  try {
    // 1) Base mínima
    await dbRun(`
      CREATE TABLE IF NOT EXISTS comandas (
        id INTEGER PRIMARY KEY AUTOINCREMENT
      );
    `);
    await dbRun(`
      CREATE TABLE IF NOT EXISTS itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT
      );
    `);
    await dbRun(`
      CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT
      );
    `);

    // 2) Migrações (garante tudo que o app usa)
    await ensureColumn('comandas', 'nome', 'TEXT');
    await ensureColumn('comandas', 'status', 'TEXT');
    await ensureColumn('comandas', 'updated_at', 'TEXT');

    await ensureColumn('itens', 'comanda_id', 'INTEGER');
    await ensureColumn('itens', 'produto', 'TEXT');
    await ensureColumn('itens', 'qtd', 'INTEGER');
    await ensureColumn('itens', 'preco_unit', 'REAL');
    await ensureColumn('itens', 'obs', 'TEXT');
    await ensureColumn('itens', 'updated_at', 'TEXT');

    await ensureColumn('produtos', 'nome', 'TEXT');
    await ensureColumn('produtos', 'preco', 'REAL');
    await ensureColumn('produtos', 'updated_at', 'TEXT');

    // 3) Normalizações
    await dbRun(`UPDATE comandas SET status = 'aberta' WHERE status IS NULL;`);

    // 4) Índices
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_itens_comanda ON itens(comanda_id);`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);`);
  } catch (e) {
    console.log('[initDb] erro:', e?.message || e);
    throw e;
  }
}

// ---------- HELPERS DE ALTO NÍVEL (use nas telas) ----------
// COMANDAS
export async function criarComanda(nome) {
  const n = String(nome ?? '').trim();
  if (!n) throw new Error('Nome da comanda obrigatório.');
  const res = await dbRun(
    `INSERT INTO comandas (nome, status, updated_at)
     VALUES (?, 'aberta', datetime('now'));`,
    [n]
  );
  return res.insertId;
}

export async function fecharComanda(id) {
  await dbRun(
    `UPDATE comandas SET status = 'fechada', updated_at = datetime('now') WHERE id = ?;`,
    [Number(id)]
  );
}

export async function getComandasAbertas() {
  return dbSelectAll(
    `SELECT * FROM comandas WHERE status = 'aberta' ORDER BY nome COLLATE NOCASE ASC;`
  );
}

export async function getComandaById(id) {
  const rows = await dbSelectAll(`SELECT * FROM comandas WHERE id = ?;`, [Number(id)]);
  return rows?.[0] ?? null;
}

// ITENS
export async function criarItem({ comanda_id, produto, qtd, preco_unit, obs }) {
  return dbRun(
    `INSERT INTO itens (comanda_id, produto, qtd, preco_unit, obs, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'));`,
    [Number(comanda_id), String(produto||''), Number(qtd)||0, Number(preco_unit)||0, String(obs||'')]
  );
}

export async function listarItens(comandaId) {
  return dbSelectAll(
    `SELECT * FROM itens WHERE comanda_id = ? ORDER BY id ASC;`,
    [Number(comandaId)]
  );
}

export async function excluirItem(itemId) {
  return dbRun(`DELETE FROM itens WHERE id = ?;`, [Number(itemId)]);
}

// PRODUTOS
export async function listarProdutos() {
  return dbSelectAll(`SELECT * FROM produtos ORDER BY nome COLLATE NOCASE ASC;`);
}

export async function buscarProdutosLike(q) {
  return dbSelectAll(
    `SELECT id, nome, preco FROM produtos WHERE nome LIKE ? ORDER BY nome COLLATE NOCASE ASC LIMIT 8;`,
    [`%${String(q||'')}%`]
  );
}

export async function salvarProduto({ id, nome, preco }) {
  const n = String(nome || '').trim();
  const p = Number(preco) || 0;

  if (id) {
    // update
    await dbRun(
      `UPDATE produtos SET nome = ?, preco = ?, updated_at = datetime('now') WHERE id = ?;`,
      [n, p, Number(id)]
    );
    return id;
  }

  // insert (se existir por nome, atualiza)
  const found = await dbSelectAll(`SELECT id FROM produtos WHERE nome = ?;`, [n]);
  if (found.length) {
    await dbRun(
      `UPDATE produtos SET preco = ?, updated_at = datetime('now') WHERE id = ?;`,
      [p, Number(found[0].id)]
    );
    return found[0].id;
  }
  const res = await dbRun(
    `INSERT INTO produtos (nome, preco, updated_at)
     VALUES (?, ?, datetime('now'));`,
    [n, p]
  );
  return res.insertId;
}

export async function removerProduto(id) {
  await dbRun(`DELETE FROM produtos WHERE id = ?;`, [Number(id)]);
}
