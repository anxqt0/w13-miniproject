import sql from 'mssql';

let poolPromise = null;

export function getSqlPool() {
  const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
  if (!connectionString) {
    const err = new Error('AZURE_SQL_CONNECTION_STRING is not set');
    err.code = 'NO_DB_CONFIG';
    throw err;
  }

  // `mssql` reports an opaque TypeError when the connection string is set but
  // does not contain the required SQL Server host. Catch that configuration
  // mistake here so the API can return a useful setup hint instead.
  const hasServer = /(?:^|;)\s*(?:Server|Data Source)\s*=\s*[^;]+/i.test(connectionString);
  const hasDatabase = /(?:^|;)\s*(?:Initial Catalog|Database)\s*=\s*[^;]+/i.test(connectionString);
  if (!hasServer || !hasDatabase) {
    const err = new Error('AZURE_SQL_CONNECTION_STRING must include Server and Initial Catalog values');
    err.code = 'INVALID_DB_CONFIG';
    throw err;
  }

  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(connectionString)
      .connect()
      .then(pool => {
        pool.on('close', () => { poolPromise = null; });
        return pool;
      })
      .catch(err => {
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}
