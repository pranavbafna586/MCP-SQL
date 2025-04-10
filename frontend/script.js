// script.js - Client-side JavaScript for the MCP Database Query Interface

// Config
const API_BASE_URL = "http://localhost:3000/api";

// DOM Element References
const elements = {
  // Status and connection elements
  statusIndicator: document.getElementById("status-indicator"),
  statusText: document.getElementById("status-text"),
  testConnectionBtn: document.getElementById("test-connection"),

  // Query and mode elements
  queryInput: document.getElementById("query-input"),
  writeModeToggle: document.getElementById("write-mode-toggle"),
  writePermissions: document.getElementById("write-permissions"),
  allowInsert: document.getElementById("allow-insert"),
  allowUpdate: document.getElementById("allow-update"),
  allowDelete: document.getElementById("allow-delete"),
  runQueryBtn: document.getElementById("run-query"),

  // Results display elements
  message: document.getElementById("message"),
  generatedQuery: document.getElementById("generated-query"),
  resultsTable: document.getElementById("results-table"),
};

// State management
const state = {
  connected: false,
  loading: false,
  mode: "read-only",
};

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Test connection button
  elements.testConnectionBtn.addEventListener("click", testConnection);

  // Write mode toggle
  elements.writeModeToggle.addEventListener("change", toggleWriteMode);

  // Run query button
  elements.runQueryBtn.addEventListener("click", handleQuerySubmission);
});

// Handler Functions
async function testConnection() {
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/test-connection`);
    const data = await response.json();

    if (data.status === "success") {
      setConnectionStatus(true);
      showMessage("Database connection successful!", "success");
    } else {
      setConnectionStatus(false);
      showMessage(`Database connection failed: ${data.message}`, "error");
    }
  } catch (error) {
    setConnectionStatus(false);
    showMessage(`Failed to connect to the server: ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
}

function toggleWriteMode(event) {
  if (event.target.checked) {
    elements.writePermissions.classList.remove("hidden");
    state.mode = "write";
  } else {
    elements.writePermissions.classList.add("hidden");
    // Reset checkboxes when disabling write mode
    elements.allowInsert.checked = false;
    elements.allowUpdate.checked = false;
    elements.allowDelete.checked = false;
    state.mode = "read-only";
  }
}

async function handleQuerySubmission() {
  const query = elements.queryInput.value.trim();

  if (!query) {
    showMessage("Please enter a query", "error");
    return;
  }

  if (!state.connected) {
    showMessage("Please test the database connection first", "error");
    return;
  }

  setLoading(true);
  clearResults();

  try {
    const response = await fetch(`${API_BASE_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        mode: state.mode,
        allowInsert: elements.allowInsert.checked,
        allowUpdate: elements.allowUpdate.checked,
        allowDelete: elements.allowDelete.checked,
      }),
    });

    const data = await response.json();

    // Display overall status message
    showMessage(data.message, data.status === "error" ? "error" : "success");

    // Handle multiple queries case (new format)
    if (data.queries && Array.isArray(data.queries)) {
      displayMultipleQueries(data.queries);

      // If tables were modified, show their current state
      if (data.modifiedTables && data.modifiedTables.length > 0) {
        displayModifiedTables(data.modifiedTables);
      }

      // Display raw Gemini response for debugging if available
      if (data.rawGeminiResponse || data.fullPrompt) {
        displayRawGeminiResponse(data.rawGeminiResponse, data.fullPrompt);
      }
    }
    // Handle single query case (old format for backward compatibility)
    else if (data.query) {
      elements.generatedQuery.textContent = data.query;

      if (data.results) {
        displayResults(data.results);
      }
    }
  } catch (error) {
    showMessage(`Error processing request: ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
}

// UI Helper Functions
function setConnectionStatus(connected) {
  state.connected = connected;

  if (connected) {
    elements.statusIndicator.className = "status-connected";
    elements.statusText.textContent = "Connected";
  } else {
    elements.statusIndicator.className = "status-disconnected";
    elements.statusText.textContent = "Disconnected";
  }
}

function setLoading(isLoading) {
  state.loading = isLoading;

  if (isLoading) {
    // Disable buttons and show loading state
    elements.testConnectionBtn.disabled = true;
    elements.runQueryBtn.disabled = true;
    elements.runQueryBtn.textContent = "Processing...";

    if (elements.statusIndicator.className !== "status-connected") {
      elements.statusIndicator.className = "status-loading";
      elements.statusText.textContent = "Connecting...";
    }
  } else {
    // Re-enable buttons and restore original text
    elements.testConnectionBtn.disabled = false;
    elements.runQueryBtn.disabled = false;
    elements.runQueryBtn.textContent = "Run Query";
  }
}

function showMessage(text, type) {
  elements.message.textContent = text;
  elements.message.className = type; // 'success', 'error', or 'info'
}

function clearResults() {
  elements.resultsTable.innerHTML = "";
  elements.generatedQuery.textContent = "-- SQL query will appear here --";
}

// Display multiple queries and their results
function displayMultipleQueries(queries) {
  elements.resultsTable.innerHTML = "";

  // Create a container for all queries
  const queriesContainer = document.createElement("div");
  queriesContainer.className = "queries-container";

  queries.forEach((queryData, index) => {
    const queryContainer = document.createElement("div");
    queryContainer.className = `query-result-container ${queryData.status}`;

    // Create header with query number
    const queryHeader = document.createElement("h3");
    queryHeader.textContent = `Query ${queryData.queryNumber}`;
    queryContainer.appendChild(queryHeader);

    // Add status indicator
    const statusIndicator = document.createElement("div");
    statusIndicator.className = `query-status ${queryData.status}`;
    statusIndicator.textContent = queryData.status.toUpperCase();
    queryContainer.appendChild(statusIndicator);

    // Add message (especially important for errors)
    const messageDiv = document.createElement("div");
    messageDiv.className = "query-message";
    messageDiv.textContent = queryData.message;
    queryContainer.appendChild(messageDiv);

    // Show the SQL query
    const sqlDiv = document.createElement("div");
    sqlDiv.className = "query-sql";

    const sqlLabel = document.createElement("h4");
    sqlLabel.textContent = "SQL Query:";
    sqlDiv.appendChild(sqlLabel);

    const sqlCode = document.createElement("pre");
    sqlCode.textContent = queryData.query;
    sqlDiv.appendChild(sqlCode);

    queryContainer.appendChild(sqlDiv);

    // Show results if any
    if (queryData.results && queryData.results.length > 0) {
      const resultsDiv = document.createElement("div");
      resultsDiv.className = "query-results";

      const resultsLabel = document.createElement("h4");
      resultsLabel.textContent = "Results:";
      resultsDiv.appendChild(resultsLabel);

      // Create table with results
      resultsDiv.appendChild(createTable(queryData.results));

      queryContainer.appendChild(resultsDiv);
    } else if (queryData.status === "success") {
      // If successful but no results (like for INSERT/UPDATE)
      const noResultsDiv = document.createElement("div");
      noResultsDiv.className = "query-no-results";
      noResultsDiv.textContent = "Operation completed successfully.";
      queryContainer.appendChild(noResultsDiv);
    }

    // Add a separator between queries
    queryContainer.appendChild(document.createElement("hr"));

    queriesContainer.appendChild(queryContainer);
  });

  elements.resultsTable.appendChild(queriesContainer);
}

// Display tables that were modified
function displayModifiedTables(tables) {
  const modifiedTablesContainer = document.createElement("div");
  modifiedTablesContainer.className = "modified-tables-container";

  const heading = document.createElement("h3");
  heading.textContent = "Modified Tables Current State:";
  heading.className = "modified-tables-heading";
  modifiedTablesContainer.appendChild(heading);

  tables.forEach((tableData) => {
    const tableContainer = document.createElement("div");
    tableContainer.className = "modified-table";

    const tableHeading = document.createElement("h4");
    tableHeading.textContent = `Table: ${tableData.tableName}`;
    tableContainer.appendChild(tableHeading);

    if (tableData.data && tableData.data.length > 0) {
      tableContainer.appendChild(createTable(tableData.data));
    } else {
      const emptyMessage = document.createElement("p");
      emptyMessage.textContent = "No records in this table.";
      tableContainer.appendChild(emptyMessage);
    }

    modifiedTablesContainer.appendChild(tableContainer);
  });

  elements.resultsTable.appendChild(modifiedTablesContainer);
}

// Create an HTML table from data
function createTable(data) {
  // If no results or empty array
  if (!data || data.length === 0) {
    const noData = document.createElement("p");
    noData.textContent = "No results found.";
    return noData;
  }

  // Create table
  const table = document.createElement("table");

  // Create table header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  // Get column names from the first result
  const columns = Object.keys(data[0]);
  columns.forEach((column) => {
    const th = document.createElement("th");
    th.textContent = column;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement("tbody");

  // Add data rows
  data.forEach((row) => {
    const tr = document.createElement("tr");

    columns.forEach((column) => {
      const td = document.createElement("td");
      // Handle null values
      td.textContent = row[column] !== null ? row[column] : "NULL";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

// Helper function to display single result set (for backward compatibility)
function displayResults(results) {
  elements.resultsTable.appendChild(createTable(results));
}

// Display the raw Gemini API response and prompt (for debugging)
function displayRawGeminiResponse(rawResponse, fullPrompt) {
  // Log debug info to console to help troubleshoot
  console.log("Debug info received:", {
    hasRawResponse: !!rawResponse,
    hasFullPrompt: !!fullPrompt,
    fullPromptLength: fullPrompt ? fullPrompt.length : 0,
  });

  if (!rawResponse && !fullPrompt) {
    console.warn("No debug information available to display");
    return;
  }

  const debugContainer = document.createElement("div");
  debugContainer.className = "debug-container";

  // Display Gemini Prompt
  if (fullPrompt) {
    const promptHeading = document.createElement("h3");
    promptHeading.textContent = "Gemini API Prompt (Debug):";
    promptHeading.className = "debug-heading";
    debugContainer.appendChild(promptHeading);

    const togglePromptButton = document.createElement("button");
    togglePromptButton.textContent = "Show/Hide Prompt";
    togglePromptButton.className = "toggle-debug-button";
    debugContainer.appendChild(togglePromptButton);

    const promptDisplay = document.createElement("pre");
    promptDisplay.className = "raw-prompt hidden";
    promptDisplay.textContent = fullPrompt;
    debugContainer.appendChild(promptDisplay);

    // Add toggle functionality
    togglePromptButton.addEventListener("click", () => {
      promptDisplay.classList.toggle("hidden");
    });
  }

  // Display Gemini Response
  if (rawResponse) {
    const responseHeading = document.createElement("h3");
    responseHeading.textContent = "Gemini API Raw Response (Debug):";
    responseHeading.className = "debug-heading";
    debugContainer.appendChild(responseHeading);

    const toggleResponseButton = document.createElement("button");
    toggleResponseButton.textContent = "Show/Hide Raw Response";
    toggleResponseButton.className = "toggle-debug-button";
    debugContainer.appendChild(toggleResponseButton);

    const responseDisplay = document.createElement("pre");
    responseDisplay.className = "raw-response hidden";
    responseDisplay.textContent = rawResponse;
    debugContainer.appendChild(responseDisplay);

    // Add toggle functionality
    toggleResponseButton.addEventListener("click", () => {
      responseDisplay.classList.toggle("hidden");
    });
  }

  elements.resultsTable.appendChild(debugContainer);
}
