import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('kitutes.db');

// cria tabelas
db.execAsync(`
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
    quantidade INTEGER NOT NULL,
    preco_unit REAL NOT NULL
  );
`);

export default db;
