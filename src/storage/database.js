// src/storage/database.js
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

let getDb;
let initDb;

/** ===================== WEB (memória) ===================== */
if (isWeb) {
  const memory = {
    produtos: new Map(),  // id -> { id, nome, preco }
    vendas: [],           // { id, data, comanda, produto_id, quantidade, preco_unit }
    comandas: new Map(),  // id -> { id, aberta_em }
    autoVendaId: 1,
  };

  const db = {
    async execAsync(_sql) {},
    async getAllAsync(sql, params = []) {
      const up = sql.trim().toUpperCase();

      if (up.startsWith('SELECT * FROM PRODUTOS')) {
        return Array.from(memory.produtos.values()).sort((a, b) => a.nome.localeCompare(b.nome));
      }

      if (up.startsWith('SELECT * FROM VENDAS WHERE DATA =')) {
        const data = params[0];
        return memory.vendas.filter(v => v.data === data).sort((a, b) => b.id - a.id);
      }

      if (up.startsWith('SELECT * FROM COMANDAS')) {
        // Ordena por id (alfabético, case-insensitive)
        return Array.from(memory.comandas.values()).sort((a, b) =>
          a.id.localeCompare(b.id, 'pt', { sensitivity: 'base' })
        );
      }

      if (up.startsWith('SELECT ID FROM COMANDAS WHERE ID =')) {
        const id = String(params[0]);
        return memory.comandas.has(id) ? [{ id }] : [];
      }

      return [];
    },
    async runAsync(sql, params = []) {
      const up = sql.trim().toUpperCase();

      if (up.startsWith('INSERT OR REPLACE INTO PRODUTOS')) {
        const [id, nome, preco] = params;
        memory.produtos.set(String(id), { id: String(id), nome: String(nome), preco: Number(preco) });
        return;
      }
      if (up.startsWith('DELETE FROM PRODUTOS WHERE ID =')) {
        const [id] = params;
        memory.produtos.delete(String(id));
        return;
      }
      if (up.startsWith('INSERT INTO VENDAS')) {
        const [data, comanda, produto_id, quantidade, preco_unit] = params;
        memory.vendas.push({
          id: memory.autoVendaId++,
          data: String(data),
          comanda: String(comanda),
          produto_id: String(produto_id),
          quantidade: Number(quantidade),
          preco_unit: Number(preco_unit),
        });
        return;
      }
      if (up.startsWith('INSERT INTO COMANDAS')) {
        const [id, aberta_em] = params;
        memory.comandas.set(String(id), { id: String(id), aberta_em: String(aberta_em) });
        return;
      }
      if (up.startsWith('DELETE FROM COMANDAS WHERE ID =')) {
        const [id] = params;
        memory.comandas.delete(String(id));
        return;
      }
    },
  };

  let initDone = false;
  getDb = async () => db;
  initDb = async () => {
    if (!initDone) {
      initDone = true;
    }
    return db;
  };
}

/** ===================== ANDROID / iOS (SQLite real) ===================== */
else {
  const SQLite = require('expo-sqlite');
  let dbPromise = null;

  async function _openDb() {
    if (SQLite.openDatabaseAsync) {
      return await SQLite.openDatabaseAsync('kitutes.db');
    }
    const legacy = SQLite.openDatabase('kitutes.db');
    return {
      execAsync: (sql) => new Promise((resolve, reject) => {
        legacy.transaction(tx => tx.executeSql(sql, [], () => resolve(), (_, err) => { reject(err); return true; }));
      }),
      runAsync: (sql, params = []) => new Promise((resolve, reject) => {
        legacy.transaction(tx => tx.executeSql(sql, params, () => resolve(), (_, err) => { reject(err); return true; }));
      }),
      getAllAsync: (sql, params = []) => new Promise((resolve, reject) => {
        legacy.transaction(tx => tx.executeSql(sql, params, (_, { rows }) => resolve(rows._array || []), (_, err) => { reject(err); return true; }));
      }),
    };
  }

  getDb = () => {
    if (!dbPromise) dbPromise = _openDb();
    return dbPromise;
  };

  initDb = async () => {
    const db = await getDb();
    try {
      // Cria todas as tabelas necessárias
      await db.execAsync?.(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS produtos (
          id TEXT PRIMARY KEY NOT NULL,
          nome TEXT NOT NULL,
          preco REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS vendas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data TEXT NOT NULL,
          comanda TEXT NOT NULL,
          produto_id TEXT NOT NULL,
          quantidade REAL NOT NULL,
          preco_unit REAL NOT NULL,
          FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS comandas (
          id TEXT PRIMARY KEY NOT NULL,
          aberta_em TEXT NOT NULL
        );
      `);

      if (!db.execAsync) {
        await db.runAsync('PRAGMA foreign_keys = ON;');
        await db.runAsync(`CREATE TABLE IF NOT EXISTS produtos (
          id TEXT PRIMARY KEY NOT NULL,
          nome TEXT NOT NULL,
          preco REAL NOT NULL
        );`);
        await db.runAsync(`CREATE TABLE IF NOT EXISTS vendas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data TEXT NOT NULL,
          comanda TEXT NOT NULL,
          produto_id TEXT NOT NULL,
          quantidade REAL NOT NULL,
          preco_unit REAL NOT NULL
        );`);
        await db.runAsync(`CREATE TABLE IF NOT EXISTS comandas (
          id TEXT PRIMARY KEY NOT NULL,
          aberta_em TEXT NOT NULL
        );`);
      }
    } catch (e) {
      console.error('Erro criando tabelas', e);
      throw new Error('Falha ao inicializar o banco local.');
    }

    try {
      await db.getAllAsync('SELECT 1 as ok');
    } catch (e) {
      console.error('Sanity check falhou', e);
      throw new Error('Banco indisponível no dispositivo.');
    }
    return db;
  };
}

export { getDb, initDb };
