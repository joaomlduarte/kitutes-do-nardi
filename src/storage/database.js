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
    comandas: new Map(),         // id -> { id, nome, status }
    itens: new Map(),            // id -> { id, comanda_id, produto, qtd, preco_unit, obs }
    produtosById: new Map(),     // id -> { id, nome, preco }
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
          const nome = params[0];
          const id = mem.autoCid++;
          mem.comandas.set(id, { id, nome, status: 'aberta' });
          return okWrap(ok, { insertId: id, rowsAffected: 1 });
        }
        if (U.startsWith("UPDATE COMANDAS SET STATUS = 'FECHADA'")) {
          const id = params[0];
          const c = mem.comandas.get(id);
          if (c) c.status = 'fechada';
          return okWrap(ok, { rowsAffected: c ? 1 : 0 });
        }
        if (U.startsWith("SELECT * FROM COMANDAS WHERE STATUS = 'ABERTA' ORDER BY NOME COLLATE NOCASE ASC")) {
          const arr = Array.from(mem.comandas.values())
            .filter(c => c.status === 'aberta')
            .sort((a, b) => a.nome.localeCompare(b.nome, undefined, { sensitivity: 'base' }));
          return ok?.(txStub, { rows: { _array: arr } });
        }
        if (U.startsWith('SELECT * FROM COMANDAS WHERE ID = ?')) {
          const id = params[0];
          const c = mem.comandas.get(id);
          return ok?.(txStub, { rows: { _array: c ? [c] : [] } });
        }

        // ===== ITENS =====
        if (U.startsWith('INSERT INTO ITENS')) {
          const [comanda_id, produto, qtd, preco_unit, obs] = params;
          const id = mem.autoIid++;
          mem.itens.set(id, { id, comanda_id, produto, qtd, preco_unit, obs });
          return okWrap(ok, { insertId: id, rowsAffected: 1 });
        }
        if (U.startsWith('DELETE FROM ITENS WHERE ID = ?')) {
          const id = params[0];
          const okDel = mem.itens.delete(id);
          return okWrap(ok, { rowsAffected: okDel ? 1 : 0 });
        }
        if (U.startsWith('SELECT * FROM ITENS WHERE COMANDA_ID = ? ORDER BY ID ASC')) {
          const cid = params[0];
          const arr = Array.from(mem.itens.values())
            .filter(i => i.comanda_id === cid)
            .sort((a, b) => a.id - b.id);
          return ok?.(txStub, { rows: { _array: arr } });
        }

        // ===== PRODUTOS (CRUD completo com id) =====
        // INSERT
        if (U.startsWith('INSERT INTO PRODUTOS')) {
          const [nome, preco] = params;
          const key = String(nome || '').toLowerCase();
          // se já existir pelo nome, apenas atualiza o preço e retorna como "update"
          if (mem.produtoNameToId.has(key)) {
            const id = mem.produtoNameToId.get(key);
            const p = mem.produtosById.get(id);
            p.preco = Number(preco) || 0;
            mem.produtosById.set(id, p);
            return okWrap(ok, { rowsAffected: 1, insertId: undefined });
          }
          const id = mem.autoPid++;
          const p = { id, nome, preco: Number(preco) || 0 };
          mem.produtosById.set(id, p);
          mem.produtoNameToId.set(key, id);
          return okWrap(ok, { insertId: id, rowsAffected: 1 });
        }

        // UPDATE por id
        if (U.startsWith('UPDATE PRODUTOS SET PRECO = ? WHERE ID = ?')) {
          const [preco, id] = params;
          const p = mem.produtosById.get(Number(id));
          if (p) {
            p.preco = Number(preco) || 0;
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
          // atualizar índice por nome
          mem.produtoNameToId.delete(String(old.nome).toLowerCase());
          mem.produtoNameToId.set(String(nome).toLowerCase(), pid);
          mem.produtosById.set(pid, { id: pid, nome, preco: Number(preco) || 0 });
          return okWrap(ok, { rowsAffected: 1 });
        }

        // DELETE por id
        if (U.startsWith('DELETE FROM PRODUTOS WHERE ID = ?')) {
          const id = Number(params[0]);
          const old = mem.produtosById.get(id);
          if (!old) return okWrap(ok, { rowsAffected: 0 });
          mem.produtosById.delete(id);
          mem.produtoNameToId.delete(String(old.nome).toLowerCase());
          return okWrap(ok, { rowsAffected: 1 });
        }

        // SELECTS
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

        // DROP TABLE
        if (U.startsWith('DROP TABLE')) return okWrap(ok, { rowsAffected: 1 });

        // default vazio
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



// ---------- tentativa de carregar expo-sqlite ----------
let _sqliteMod = undefined;
function getSQLiteOrNull() {
  if (_sqliteMod !== undefined) return _sqliteMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-sqlite');
    if (mod?.openDatabase || mod?.default?.openDatabase) {
      _sqliteMod = mod;
    } else {
      _sqliteMod = null;
    }
  } catch {
    _sqliteMod = null;
  }
  return _sqliteMod;
}

// ---------- instância única ----------
let _db = null;
export function getDb() {
  if (_db) return _db;

  if (isWeb) {
    console.warn('[database] Web: usando banco em memória.');
    _db = makeMemoryDb();
    return _db;
  }

  const sqlite = getSQLiteOrNull();
  const openDatabase = sqlite?.openDatabase || sqlite?.default?.openDatabase;

  if (typeof openDatabase !== 'function') {
    console.warn('[database] expo-sqlite indisponível; usando banco em memória.');
    _db = makeMemoryDb();
    return _db;
  }

  log('Abrindo SQLite kitutes.db');
  _db = openDatabase('kitutes.db');
  return _db;
}

// wrappers Promise
export const dbSelectAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    const t0 = Date.now();
    getDb().transaction(tx => {
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
    getDb().transaction(tx => {
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

// init schema
export async function initDb() {
  try {
    await dbRun(`
      CREATE TABLE IF NOT EXISTS comandas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        status TEXT
      );
    `);
    await dbRun(`
      CREATE TABLE IF NOT EXISTS itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comanda_id INTEGER,
        produto TEXT,
        qtd INTEGER,
        preco_unit REAL,
        obs TEXT
      );
    `);
    await dbRun(`
      CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        preco REAL
      );
    `);
    await dbRun(`UPDATE comandas SET status = 'aberta' WHERE status IS NULL;`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_itens_comanda ON itens(comanda_id);`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);`);
  } catch (e) {
    console.log('[initDb] erro:', errStr(e));
    throw e;
  }
}
