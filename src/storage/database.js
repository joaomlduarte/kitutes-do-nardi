// src/storage/database.js
// Nota: usamos "require" lazy para evitar acessar Platform antes do runtime estar pronto.
// Isso resolve o erro: [runtime not ready]: ReferenceError: Property 'Platform' doesn't exist.

const getPlatformOS = () => {
  try {
    const rn = require('react-native');
    return rn?.Platform?.OS ?? 'web';
  } catch {
    // Se ainda não está pronto, assume web (e cairá no fallback em memória)
    return 'web';
  }
};

const isWeb = getPlatformOS() === 'web';

// ===== util de log =====
const LOG_SQL = true;
const log = (...a) => { if (LOG_SQL) console.log('[db]', ...a); };
const asErr = (e) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e ?? 'unknown'));

// ===== API comum (runAsync / selectAll / execAsync) =====
let _db = null;

// ---------- DB em memória (fallback p/ Web) ----------
function makeMemoryDb() {
  const mem = {
    produtos: new Map(), // id -> { id, nome, preco, updated_at }
    comandas: new Map(), // id -> { id, nome, status, aberta_em, fechada_em, updated_at }
    itens:    new Map(), // id -> { id, comanda_id, produto, qtd, preco_unit, obs, updated_at }
    auto: { produto: 1, comanda: 1, item: 1 },
  };

  const parseNumber = (v, d = 0) => {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isNaN(n) ? d : n;
  };

  const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

  const api = {
    async execAsync(sql) {
      log('MEM execAsync:', sql?.trim());
    },

    async runAsync(sql, params = []) {
      const S = (sql || '').trim().toUpperCase();
      log('MEM runAsync:', sql?.trim(), 'params:', params);

      // ===== PRODUTOS =====
      if (S.startsWith('INSERT INTO PRODUTOS')) {
        const [nome, preco] = params;
        const id = mem.auto.produto++;
        mem.produtos.set(id, { id, nome: String(nome), preco: parseNumber(preco), updated_at: now() });
        return { changes: 1, lastInsertRowid: id, insertId: id };
      }
      if (S.startsWith('UPDATE PRODUTOS SET')) {
        const [nome, preco, id] = params;
        const p = mem.produtos.get(Number(id));
        if (!p) return { changes: 0 };
        p.nome = String(nome);
        p.preco = parseNumber(preco);
        p.updated_at = now();
        mem.produtos.set(Number(id), p);
        return { changes: 1 };
      }
      if (S.startsWith('DELETE FROM PRODUTOS WHERE ID = ?')) {
        const [id] = params;
        const ok = mem.produtos.delete(Number(id));
        return { changes: ok ? 1 : 0 };
      }

      // ===== COMANDAS =====
      if (S.startsWith('INSERT INTO COMANDAS')) {
        const [nome] = params;
        const id = mem.auto.comanda++;
        mem.comandas.set(id, {
          id,
          nome: String(nome),
          status: 'aberta',
          aberta_em: now(),
          fechada_em: null,
          updated_at: now(),
        });
        return { changes: 1, lastInsertRowid: id, insertId: id };
      }
      if (S.startsWith("UPDATE COMANDAS SET STATUS = 'FECHADA'")) {
        const [id] = params;
        const c = mem.comandas.get(Number(id));
        if (!c) return { changes: 0 };
        c.status = 'fechada';
        c.fechada_em = now();
        c.updated_at = now();
        mem.comandas.set(Number(id), c);
        return { changes: 1 };
      }
      if (S.startsWith('DELETE FROM COMANDAS WHERE ID = ?')) {
        const [id] = params;
        const ok = mem.comandas.delete(Number(id));
        for (const [iid, it] of mem.itens) {
          if (it.comanda_id === Number(id)) mem.itens.delete(iid);
        }
        return { changes: ok ? 1 : 0 };
      }

      // ===== ITENS =====
      if (S.startsWith('INSERT INTO ITENS')) {
        const [comanda_id, produto, qtd, preco_unit, obs] = params;
        const id = mem.auto.item++;
        mem.itens.set(id, {
          id,
          comanda_id: Number(comanda_id),
          produto: String(produto),
          qtd: parseNumber(qtd, 1),
          preco_unit: parseNumber(preco_unit, 0),
          obs: obs ? String(obs) : null,
          updated_at: now(),
        });
        return { changes: 1, lastInsertRowid: id, insertId: id };
      }
      if (S.startsWith('DELETE FROM ITENS WHERE ID = ?')) {
        const [id] = params;
        const ok = mem.itens.delete(Number(id));
        return { changes: ok ? 1 : 0 };
      }
      if (S.startsWith('DELETE FROM ITENS WHERE COMANDA_ID = ?')) {
        const [cid] = params;
        let changes = 0;
        for (const [iid, it] of [...mem.itens]) {
          if (it.comanda_id === Number(cid)) {
            mem.itens.delete(iid);
            changes++;
          }
        }
        return { changes };
      }

      return { changes: 0 };
    },

    async selectAllAsync(sql, params = []) {
      const S = (sql || '').trim().toUpperCase();
      log('MEM selectAllAsync:', sql?.trim(), 'params:', params);

      if (S.startsWith('SELECT * FROM PRODUTOS WHERE NOME = ?')) {
        const [nome] = params;
        return [...mem.produtos.values()].filter(p => p.nome === String(nome));
      }
      if (S.startsWith('SELECT * FROM PRODUTOS ORDER BY')) {
        return [...mem.produtos.values()].sort((a, b) => a.nome.localeCompare(b.nome));
      }

      if (S.startsWith("SELECT * FROM COMANDAS WHERE STATUS = 'ABERTA'")) {
        return [...mem.comandas.values()]
          .filter(c => c.status === 'aberta')
          .sort((a, b) => a.nome.localeCompare(b.nome));
      }
      if (S.startsWith('SELECT * FROM COMANDAS WHERE ID = ?')) {
        const [id] = params;
        const c = mem.comandas.get(Number(id));
        return c ? [c] : [];
      }

      if (S.startsWith('SELECT * FROM ITENS WHERE COMANDA_ID = ?')) {
        const [cid] = params;
        return [...mem.itens.values()]
          .filter(i => i.comanda_id === Number(cid))
          .sort((a, b) => a.id - b.id);
      }

      if (S.startsWith('SELECT')) return [];
      return [];
    },
  };

  return api;
}

// ---------- SQLite (device) ----------
async function openSqliteDb() {
  try {
    const sqlite = require('expo-sqlite');
    const hasSync = typeof sqlite.openDatabaseSync === 'function';
    const db = hasSync ? sqlite.openDatabaseSync('kitutes.db') : sqlite.openDatabase('kitutes.db');

    const execAsync = async (sql) => {
      if (db.execAsync) return db.execAsync(sql);
      return new Promise((resolve, reject) => {
        db.transaction(
          (tx) => tx.executeSql(sql),
          (e) => reject(e),
          () => resolve()
        );
      });
    };

    const runAsync = async (sql, params = []) => {
      if (db.runAsync) return db.runAsync(sql, params);
      return new Promise((resolve, reject) => {
        db.transaction(
          (tx) => {
            tx.executeSql(
              sql,
              params,
              (_, res) => {
                resolve({
                  changes: res?.rowsAffected ?? 0,
                  lastInsertRowid: res?.insertId,
                  insertId: res?.insertId,
                });
              },
              (_, e) => {
                reject(e);
                return true;
              }
            );
          },
          (e) => reject(e)
        );
      });
    };

    const selectAllAsync = async (sql, params = []) => {
      if (db.getAllAsync) return db.getAllAsync(sql, params);
      return new Promise((resolve, reject) => {
        db.readTransaction(
          (tx) => {
            tx.executeSql(
              sql,
              params,
              (_, res) => {
                const out = [];
                const rows = res?.rows;
                const len = rows?.length ?? rows?._array?.length ?? 0;
                if (len && rows?._array) resolve(rows._array);
                else {
                  for (let i = 0; i < (rows?.length ?? 0); i++) out.push(rows.item(i));
                  resolve(out);
                }
              },
              (_, e) => {
                reject(e);
                return true;
              }
            );
          },
          (e) => reject(e)
        );
      });
    };

    return { execAsync, runAsync, selectAllAsync };
  } catch (e) {
    console.log('[db] Falha ao abrir SQLite, fallback memória:', asErr(e));
    return makeMemoryDb();
  }
}

// ---------- bootstrap + helpers ----------
export async function initDb() {
  if (_db) return _db;
  const db = isWeb ? makeMemoryDb() : await openSqliteDb();

  const createSQL = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      preco REAL NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS comandas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'aberta',
      aberta_em TEXT NOT NULL DEFAULT (datetime('now')),
      fechada_em TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comanda_id INTEGER NOT NULL,
      produto TEXT NOT NULL,
      qtd REAL NOT NULL,
      preco_unit REAL NOT NULL,
      obs TEXT,
      updated_at TEXT,
      FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_itens_comanda ON itens(comanda_id);
    CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
  `;

  try {
    await db.execAsync(createSQL);
  } catch {
    for (const stmt of createSQL.split(';')) {
      const s = stmt.trim();
      if (s) { try { await db.runAsync(s + ';'); } catch (e) { console.log('[db] erro create stmt:', asErr(e), s); } }
    }
  }

  _db = db;
  return _db;
}

export async function dbRun(sql, params = []) {
  try {
    await initDb();
    return await _db.runAsync(sql, params);
  } catch (e) {
    console.log('[dbRun] erro:', asErr(e), '\nSQL:', sql, '\nparams:', params);
    throw e;
  }
}

export async function dbSelectAll(sql, params = []) {
  try {
    await initDb();
    return await _db.selectAllAsync(sql, params);
  } catch (e) {
    console.log('[dbSelectAll] erro:', asErr(e), '\nSQL:', sql, '\nparams:', params);
    throw e;
  }
}

export async function dbExec(sql) {
  try {
    await initDb();
    return await _db.execAsync(sql);
  } catch (e) {
    console.log('[dbExec] erro:', asErr(e), '\nSQL:', sql);
    throw e;
  }
}
