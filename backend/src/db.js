// db.js - Database connection and query execution module
const mysql = require("mysql2/promise");
require("dotenv").config();

// Create a connection pool using environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Function to test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("Database connection successful");
    connection.release();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Function to get the database schema (tables and their structures)
async function getDatabaseSchema() {
  try {
    // Get list of tables
    const [tables] = await pool.query("SHOW TABLES");
    const tableNames = tables.map((table) => Object.values(table)[0]);

    // Get structure for each table
    const schema = {};
    for (const tableName of tableNames) {
      const [columns] = await pool.query(`DESCRIBE ${tableName}`);
      schema[tableName] = columns;
    }

    return schema;
  } catch (error) {
    console.error("Error fetching database schema:", error);
    throw error;
  }
}

// Function to execute a SQL query
async function executeQuery(query, params = []) {
  try {
    const [results] = await pool.query(query, params);
    return { success: true, results };
  } catch (error) {
    console.error("Query execution error:", error);
    return {
      success: false,
      error: error.message,
      sqlState: error.sqlState,
      code: error.code,
    };
  }
}

// Function to check if a query is a read-only (SELECT) query
function isReadOnlyQuery(query) {
  const trimmedQuery = query.trim().toLowerCase();
  return (
    trimmedQuery.startsWith("select") ||
    trimmedQuery.startsWith("show") ||
    trimmedQuery.startsWith("describe")
  );
}

// Function to check if a query is an INSERT operation
function isInsertQuery(query) {
  return query.trim().toLowerCase().startsWith("insert");
}

// Function to check if a query is an UPDATE operation
function isUpdateQuery(query) {
  return query.trim().toLowerCase().startsWith("update");
}

// Function to check if a query is a DELETE operation
function isDeleteQuery(query) {
  return query.trim().toLowerCase().startsWith("delete");
}

// Function to get sample data from tables (for query generation guidance)
async function getSampleRecords(tableNames, limit = 3) {
  try {
    const sampleData = {};

    for (const tableName of tableNames) {
      try {
        const [records] = await pool.query(
          `SELECT * FROM ${tableName} LIMIT ${limit}`
        );
        if (records && records.length > 0) {
          sampleData[tableName] = records;
        }
      } catch (error) {
        console.error(
          `Error fetching sample data for table ${tableName}:`,
          error
        );
        // Continue with other tables even if one fails
      }
    }

    return sampleData;
  } catch (error) {
    console.error("Error fetching sample records:", error);
    return {};
  }
}

module.exports = {
  pool,
  testConnection,
  getDatabaseSchema,
  executeQuery,
  isReadOnlyQuery,
  isInsertQuery,
  isUpdateQuery,
  isDeleteQuery,
  getSampleRecords,
};
