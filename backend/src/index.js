// index.js - Main server file for the MCP server
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const db = require("./db");
const geminiService = require("./geminiService");

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database schema cache
let databaseSchema = null;

// Helper function to refresh database schema
async function refreshDatabaseSchema() {
  try {
    databaseSchema = await db.getDatabaseSchema();
    console.log("Database schema refreshed successfully");
  } catch (error) {
    console.error("Failed to refresh database schema:", error);
  }
}

// Helper function to fetch table data after modifications
async function getTableData(tableName) {
  try {
    const result = await db.executeQuery(`SELECT * FROM ${tableName}`);
    return result.success ? result.results : null;
  } catch (error) {
    console.error(`Error fetching table data for ${tableName}:`, error);
    return null;
  }
}

// Helper function to extract table name from SQL query
function extractTableName(sqlQuery) {
  const trimmedQuery = sqlQuery.trim().toLowerCase();
  let tableName = null;

  if (trimmedQuery.startsWith("insert into")) {
    // Extract from INSERT INTO table_name
    const match = trimmedQuery.match(/insert\s+into\s+`?(\w+)`?/i);
    tableName = match ? match[1] : null;
  } else if (trimmedQuery.startsWith("update")) {
    // Extract from UPDATE table_name
    const match = trimmedQuery.match(/update\s+`?(\w+)`?/i);
    tableName = match ? match[1] : null;
  } else if (trimmedQuery.startsWith("delete")) {
    // Extract from DELETE FROM table_name
    const match = trimmedQuery.match(/delete\s+from\s+`?(\w+)`?/i);
    tableName = match ? match[1] : null;
  }

  return tableName;
}

// Endpoint to test database connection
app.get("/api/test-connection", async (req, res) => {
  try {
    const connected = await db.testConnection();
    if (connected) {
      await refreshDatabaseSchema();
      res.json({
        status: "success",
        message: "Database connection successful",
      });
    } else {
      res
        .status(500)
        .json({ status: "error", message: "Database connection failed" });
    }
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Endpoint to get database schema
app.get("/api/schema", async (req, res) => {
  try {
    if (!databaseSchema) {
      await refreshDatabaseSchema();
    }
    res.json({ status: "success", schema: databaseSchema });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Main endpoint to process natural language queries
app.post("/api/query", async (req, res) => {
  const {
    query,
    mode = "read-only",
    allowInsert = false,
    allowUpdate = false,
    allowDelete = false,
  } = req.body;

  if (!query) {
    return res.status(400).json({
      status: "error",
      message: "No query provided",
    });
  }

  try {
    // Refresh schema if needed
    if (!databaseSchema) {
      await refreshDatabaseSchema();
    }

    // Get list of tables from the schema
    const tableNames = Object.keys(databaseSchema);

    // Fetch sample records from each table (up to 3 rows per table)
    const sampleRecords = await db.getSampleRecords(tableNames, 3);

    // Format sample records as string for inclusion in the prompt
    let sampleRecordsText = "";
    for (const [tableName, records] of Object.entries(sampleRecords)) {
      if (records && records.length > 0) {
        sampleRecordsText += `\nSample data from ${tableName} table:\n`;
        records.forEach((record, index) => {
          sampleRecordsText += `- Record ${index + 1}: ${JSON.stringify(
            record
          )}\n`;
        });
      }
    }

    // Generate a list of SQL queries from natural language using Gemini API
    const processedQuery = `
    Process the following request into one or more SQL queries.
    If the request involves multiple operations (like creating a table AND inserting data), 
    return each SQL query as an item in a numbered list.
    If it's a single operation, just return the SQL query.
    
    Sample data from the database to help you understand the existing data format:
    ${sampleRecordsText}
    
    Request: "${query}"
    `;

    const geminiResponse = await geminiService.generateSQLQueries(
      processedQuery,
      databaseSchema
    );

    // Extract queries, raw response, and full prompt
    const sqlQueries = geminiResponse.queries || [];
    const rawGeminiResponse = geminiResponse.rawResponse || "";
    const fullGeminiPrompt = geminiResponse.fullPrompt || "";

    const results = [];
    const tablesModified = new Set();
    let hasErrors = false;

    // Process each query
    for (let i = 0; i < sqlQueries.length; i++) {
      const sqlQuery = sqlQueries[i];

      // Validate the query
      const validationResult = await geminiService.validateQuery(sqlQuery);

      if (!validationResult.valid) {
        results.push({
          queryNumber: i + 1,
          status: "error",
          message: `VALIDATION ERROR: ${validationResult.message}`,
          query: sqlQuery,
        });
        hasErrors = true;
        continue;
      }

      // Check operation mode and permissions
      const isReadOnly = db.isReadOnlyQuery(sqlQuery);
      const isInsert = db.isInsertQuery(sqlQuery);
      const isUpdate = db.isUpdateQuery(sqlQuery);
      const isDelete = db.isDeleteQuery(sqlQuery);

      // Enforce read-only mode
      if (mode === "read-only" && !isReadOnly) {
        results.push({
          queryNumber: i + 1,
          status: "error",
          message:
            "PERMISSION ERROR: Write operations are disabled in Read-Only mode.",
          query: sqlQuery,
        });
        hasErrors = true;
        continue;
      }

      // Check specific write permissions
      if (mode === "write") {
        if (isInsert && !allowInsert) {
          results.push({
            queryNumber: i + 1,
            status: "error",
            message:
              "PERMISSION ERROR: INSERT operations are not allowed based on your settings.",
            query: sqlQuery,
          });
          hasErrors = true;
          continue;
        }

        if (isUpdate && !allowUpdate) {
          results.push({
            queryNumber: i + 1,
            status: "error",
            message:
              "PERMISSION ERROR: UPDATE operations are not allowed based on your settings.",
            query: sqlQuery,
          });
          hasErrors = true;
          continue;
        }

        if (isDelete && !allowDelete) {
          results.push({
            queryNumber: i + 1,
            status: "error",
            message:
              "PERMISSION ERROR: DELETE operations are not allowed based on your settings.",
            query: sqlQuery,
          });
          hasErrors = true;
          continue;
        }
      }

      // Check if we're modifying a table
      if (!isReadOnly) {
        const tableName = extractTableName(sqlQuery);
        if (tableName) {
          tablesModified.add(tableName);
        }
      }

      // Execute the SQL query
      const queryResult = await db.executeQuery(sqlQuery);

      if (queryResult.success) {
        // Return different success messages based on query type
        let message = "Query executed successfully.";
        if (!isReadOnly) {
          message = "Database updated successfully.";
        } else if (queryResult.results && queryResult.results.length === 0) {
          message = "No data found for your query.";
        } else {
          message = "Query executed successfully. Results displayed below.";
        }

        results.push({
          queryNumber: i + 1,
          status: "success",
          message,
          query: sqlQuery,
          results: queryResult.results,
        });
      } else {
        results.push({
          queryNumber: i + 1,
          status: "error",
          message: `EXECUTION ERROR: ${
            queryResult.error || "Could not process your request."
          }`,
          query: sqlQuery,
        });
        hasErrors = true;
      }
    }

    // Add table data for any modified tables
    const tableDataResults = [];
    for (const tableName of tablesModified) {
      const tableData = await getTableData(tableName);
      if (tableData) {
        tableDataResults.push({
          tableName,
          data: tableData,
        });
      }
    }

    return res.json({
      status: hasErrors ? "partial" : "success",
      message: hasErrors
        ? "Some queries encountered errors. See details below."
        : "All queries executed successfully.",
      queries: results,
      modifiedTables: tableDataResults,
      rawGeminiResponse: rawGeminiResponse,
      fullPrompt: fullGeminiPrompt,
    });
  } catch (error) {
    console.error("Error processing query:", error);
    return res.status(500).json({
      status: "error",
      message: "SERVER ERROR: Failed to process your request: " + error.message,
    });
  }
});

// Start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`MCP Server running on port ${PORT}`);
    try {
      // Test database connection
      const connected = await db.testConnection();
      if (connected) {
        // Initial schema refresh
        await refreshDatabaseSchema();
      }
    } catch (error) {
      console.error("Server initialization error:", error);
    }
  });
}

// Export the app for external use (e.g., in server.js)
module.exports = app;
