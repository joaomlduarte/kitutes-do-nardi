import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

let getDb;
let initDb;

/* ======================= WEB (shim em memória) ======================= */
if (isWeb) {
  const memory = {
    produtos: new Map(),   // id -> { id, nome, preco }
    vendas: [],            // { id, data, comanda, produto_id, quantidade, preco_unit }
    autoVendaId: 1,

    comandas: new Map(),   // id -> { id, nome, criada_em }
    itensAbertos: [],      // { id, comanda_id, produto_id, quantidade, preco_unit }
    autoItemAbertoId: 1,
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

      if (up.startsWith('SELECT QUANTIDADE, PRECO_UNIT FROM VENDAS WHERE DATA =')) {
        const data = params[0];
        return memory.vendas
          .filter(v => v.data === data)
          .map(v => ({ quantidade: v.quantidade, preco_unit: v.preco_unit }));
      }

      if (up.startsWith('SELECT * FROM COMANDAS_ABERTAS')) {
        return Array.from(memory.comandas.values()).sort((a,b) => b.criada_em.localeCompare(a.criada_em));
      }

      if (up.startsWith('SELECT * FROM ITENS_ABERTOS WHERE COMANDA_ID =')) {
        const comandaId = params[0];
        return memory.itensAbertos.filter(i => i.comanda_id === comandaId).sort((a,b)=>b.id-a.id);
      }

      if (up.startsWith('SELECT SUM(QUANTIDADE*PRECO_UNIT) AS TOTAL FROM ITENS_ABERTOS WHERE COMANDA_ID =')) {
        const comandaId = params[0];
        const tot = memory.itensAbertos
          .filter(i => i.comanda_id === comandaId)
          .reduce((a,i)=>a+Number(i.quantidade)*Number(i.preco_unit),0);
        return [{ total: tot }];
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

      if (up.startsWith('INSERT INTO COMANDAS_ABERTAS')) {
        const [id, nome, criada] = params;
        memory.comandas.set(String(id), { id: String(id), nome: String(nome), criada_em: String(criada) });
        return;
      }

      if (up.startsWith('DELETE FROM COMANDAS_ABERTAS WHERE ID =')) {
        const [id] = params;
        memory.comandas.delete(String(id));
        memory.itensAbertos = memory.itensAbertos.filter(i => i.comanda_id !== id);
        return;
      }

      if (up.startsWith('INSERT INTO ITENS_ABERTOS')) {
        const [comanda_id, produto_id, quantidade, preco_unit] = params;
        memory.itensAbertos.push({
          id: memory.autoItemAbertoId++,
          comanda_id: String(comanda_id),
          produto_id: String(produto_id),
          quantidade: Number(quantidade),
          preco_unit: Number(preco_unit),
        });
        return;
      }

      if (up.startsWith('DELETE FROM ITENS_ABERTOS WHERE ID =')) {
        const [id] = params;
        memory.itensAbertos = memory.itensAbertos.filter(i => i.id !== Number(id));
        return;
      }
    },
  };

  let initDone = false;
  getDb = async () => db;
  initDb = async () => { if (!initDone) initDone = true; return db; };
}

/* ======================= ANDROID / iOS (SQLite real) ======================= */
else {
  const { openDatabaseAsync } = require('expo-sqlite');

  let dbPromise = null;
  getDb = () => {
    if (!dbPromise) dbPromise = openDatabaseAsync('kitutes.db');
    return dbPromise;
  };

  initDb = async () => {
    const db = await getDb();
    await db.execAsync(`
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

      CREATE TABLE IF NOT EXISTS comandas_abertas (
        id TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        criada_em TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS itens_abertos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comanda_id TEXT NOT NULL,
        produto_id TEXT NOT NULL,
        quantidade REAL NOT NULL,
        preco_unit REAL NOT NULL,
        FOREIGN KEY (comanda_id) REFERENCES comandas_abertas(id) ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
      );
    `);
    return db;
  };
}

export { getDb, initDb };
