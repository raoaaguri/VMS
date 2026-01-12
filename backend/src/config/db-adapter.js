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

// Supabase-like API wrapper for PostgreSQL
class DbClient {
  from(table) {
    return new QueryBuilder(table, getPool());
  }

  rpc(fn, params) {
    throw new Error('RPC not supported in local PostgreSQL');
  }
}

class QueryBuilder {
  constructor(table, pool) {
    this.table = table;
    this.pool = pool;
    this.selectCols = '*';
    this.whereConditions = [];
    this.orderByCol = null;
    this.orderAsc = true;
    this.limitVal = null;
    this.offsetVal = null;
    this.insertData = null;
    this.updateData = null;
  }

  select(cols = '*') {
    this.selectCols = cols;
    return this;
  }

  eq(col, value) {
    this.whereConditions.push({ col, op: '=', value });
    return this;
  }

  order(col, { ascending = true } = {}) {
    this.orderByCol = col;
    this.orderAsc = ascending;
    return this;
  }

  limit(val) {
    this.limitVal = val;
    return this;
  }

  offset(val) {
    this.offsetVal = val;
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

  delete() {
    // Will be handled in the execute method
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  maybeSingle() {
    this.maybeSingleResult = true;
    return this;
  }

  async execute() {
    const client = await this.pool.connect();
    try {
      // SELECT
      if (!this.insertData && !this.updateData && !this._isDelete) {
        return await this._executeSelect(client);
      }

      // INSERT
      if (this.insertData) {
        return await this._executeInsert(client);
      }

      // UPDATE
      if (this.updateData) {
        return await this._executeUpdate(client);
      }

      // DELETE
      if (this._isDelete) {
        return await this._executeDelete(client);
      }
    } finally {
      client.release();
    }
  }

  async _executeSelect(client) {
    let query = `SELECT ${this.selectCols} FROM ${this.table}`;
    const params = [];
    let paramCount = 1;

    // WHERE clauses
    if (this.whereConditions.length > 0) {
      const whereParts = this.whereConditions.map(cond => {
        params.push(cond.value);
        return `${cond.col} ${cond.op} $${paramCount++}`;
      });
      query += ' WHERE ' + whereParts.join(' AND ');
    }

    // ORDER BY
    if (this.orderByCol) {
      query += ` ORDER BY ${this.orderByCol} ${this.orderAsc ? 'ASC' : 'DESC'}`;
    }

    // LIMIT
    if (this.limitVal) {
      query += ` LIMIT ${this.limitVal}`;
    }

    // OFFSET
    if (this.offsetVal) {
      query += ` OFFSET ${this.offsetVal}`;
    }

    try {
      const result = await client.query(query, params);
      const data = result.rows;

      if (this.singleResult) {
        return {
          data: data[0] || null,
          error: null
        };
      }

      if (this.maybeSingleResult) {
        return {
          data: data[0] || null,
          error: null
        };
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code
        }
      };
    }
  }

  async _executeInsert(client) {
    const rows = this.insertData;
    if (!rows || rows.length === 0) {
      return { data: null, error: { message: 'No data to insert' } };
    }

    const cols = Object.keys(rows[0]);
    const query = `
      INSERT INTO ${this.table} (${cols.join(', ')})
      VALUES ${rows.map((row, idx) => {
        const values = cols.map((col, colIdx) => `$${idx * cols.length + colIdx + 1}`);
        return `(${values.join(', ')})`;
      }).join(', ')}
      ON CONFLICT DO NOTHING
      RETURNING *;
    `;

    const params = rows.flatMap(row => cols.map(col => row[col]));

    try {
      const result = await client.query(query, params);
      const data = result.rows;

      if (this.singleResult) {
        return {
          data: data[0] || null,
          error: null
        };
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code
        }
      };
    }
  }

  async _executeUpdate(client) {
    if (this.whereConditions.length === 0) {
      return { data: null, error: { message: 'UPDATE requires WHERE clause' } };
    }

    const setCols = Object.keys(this.updateData);
    const query = `
      UPDATE ${this.table}
      SET ${setCols.map((col, idx) => `${col} = $${idx + 1}`).join(', ')}
      WHERE ${this.whereConditions.map((cond, idx) => `${cond.col} = $${setCols.length + idx + 1}`).join(' AND ')}
      RETURNING *;
    `;

    const params = [...Object.values(this.updateData), ...this.whereConditions.map(c => c.value)];

    try {
      const result = await client.query(query, params);
      const data = result.rows;

      if (this.singleResult) {
        return {
          data: data[0] || null,
          error: null
        };
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code
        }
      };
    }
  }

  async _executeDelete(client) {
    if (this.whereConditions.length === 0) {
      return { data: null, error: { message: 'DELETE requires WHERE clause' } };
    }

    const query = `
      DELETE FROM ${this.table}
      WHERE ${this.whereConditions.map((cond, idx) => `${cond.col} = $${idx + 1}`).join(' AND ')}
    `;

    const params = this.whereConditions.map(c => c.value);

    try {
      await client.query(query, params);
      return {
        data: { success: true },
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code
        }
      };
    }
  }
}

// Main API
export function getDbClient() {
  return new DbClient();
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

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
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
