import pkg from 'pg';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pkg;

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      user: config.postgres.user,
      password: config.postgres.password,
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    logger.info('Database pool initialized');
  }
  return pool;
}

class SupabaseAdapter {
  from(table) {
    return new TableQueryBuilder(table, getPool());
  }
}

class TableQueryBuilder {
  constructor(table, pool) {
    this.table = table;
    this.pool = pool;
    this.selectCols = '*';
    this.whereConditions = [];
    this.orderByCol = null;
    this.orderAsc = true;
    this.insertData = null;
    this.updateData = null;
    this.singleResult = false;
  }

  select(cols = '*') {
    this.selectCols = cols;
    return this;
  }

  eq(col, value) {
    this.whereConditions.push({ col, value });
    return this;
  }

  order(col, opts = {}) {
    this.orderByCol = col;
    this.orderAsc = opts.ascending !== false;
    return this;
  }

  insert(data) {
    this.insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data) {
    this.updateData = data;
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  maybeSingle() {
    this.singleResult = true;
    return this;
  }

  async execute() {
    const client = await this.pool.connect();
    try {
      if (this.insertData) {
        return await this._insert(client);
      } else if (this.updateData) {
        return await this._update(client);
      } else {
        return await this._select(client);
      }
    } finally {
      client.release();
    }
  }

  async _select(client) {
    try {
      let sql = `SELECT ${this.selectCols} FROM ${this.table}`;
      const params = [];
      let paramNum = 1;

      if (this.whereConditions.length > 0) {
        const where = this.whereConditions
          .map(cond => {
            params.push(cond.value);
            return `${cond.col} = $${paramNum++}`;
          })
          .join(' AND ');
        sql += ` WHERE ${where}`;
      }

      if (this.orderByCol) {
        sql += ` ORDER BY ${this.orderByCol} ${this.orderAsc ? 'ASC' : 'DESC'}`;
      }

      const result = await client.query(sql, params);
      const data = result.rows;

      if (this.singleResult) {
        return { data: data[0] || null, error: null };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async _insert(client) {
    try {
      const rows = this.insertData;
      if (!rows || rows.length === 0) return { data: [], error: null };

      const keys = Object.keys(rows[0]);
      const placeholders = rows
        .map((_, rowIdx) => {
          const rowPlaceholders = keys
            .map((_, colIdx) => `$${rowIdx * keys.length + colIdx + 1}`)
            .join(', ');
          return `(${rowPlaceholders})`;
        })
        .join(', ');

      const values = rows.flatMap(row => keys.map(key => row[key]));
      const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES ${placeholders} RETURNING *`;

      const result = await client.query(sql, values);
      const data = result.rows;

      if (this.singleResult) {
        return { data: data[0] || null, error: null };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async _update(client) {
    try {
      if (this.whereConditions.length === 0) {
        return { data: null, error: new Error('UPDATE requires WHERE clause') };
      }

      const keys = Object.keys(this.updateData);
      const setClause = keys
        .map((key, idx) => `${key} = $${idx + 1}`)
        .join(', ');

      const params = [...Object.values(this.updateData)];
      let paramNum = keys.length + 1;

      const whereClause = this.whereConditions
        .map(cond => {
          params.push(cond.value);
          return `${cond.col} = $${paramNum++}`;
        })
        .join(' AND ');

      const sql = `UPDATE ${this.table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
      const result = await client.query(sql, params);
      const data = result.rows;

      if (this.singleResult) {
        return { data: data[0] || null, error: null };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  catch(fn) {
    return this.execute().catch(fn);
  }
}

export function getDbClient() {
  return new SupabaseAdapter();
}

export async function query(text, params = []) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function queryOne(text, params = []) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
