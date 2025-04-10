// geminiService.js - Handles interactions with the Gemini API
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Initialize the Google Generative AI with the API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to generate an SQL query from a natural language prompt
async function generateSQLQuery(prompt, databaseSchema) {
  try {
    // Create a model instance (using Gemini Pro model)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Construct a comprehensive prompt with schema information
    const fullPrompt = `
You are an AI assistant that converts natural language queries into SQL queries.
Given the following database schema:
${JSON.stringify(databaseSchema, null, 2)}

Generate a valid SQL query for the following request:
"${prompt}"

Return ONLY the SQL query without any explanations or markdown formatting.
The query should be executable in MySQL and properly formatted.
If multiple statements are needed, return only one complete statement that can be executed independently.
If the table is already present in the schema then do not create new table, give sql query considering the old table fields only.
Do not modify the table fields if already present also do not give sql query with 'not exists' or similar clause.
For INSERT operations to insert records which are not specified in the request, insert records like the ones already present in that table. Use realistic values everywhere.
While creating table if id field is present in it and not a foreign key then set it to auto increment by default.
`;

    // Generate content using the full prompt
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log(text);

    // Clean up the response to ensure we only get the SQL query
    return text
      .trim()
      .replace(/```sql|```/g, "")
      .trim();
  } catch (error) {
    console.error("Error generating SQL query:", error);
    throw new Error(`Failed to generate SQL query: ${error.message}`);
  }
}

// Function to generate multiple SQL queries from a natural language prompt
async function generateSQLQueries(prompt, databaseSchema) {
  try {
    // Create a model instance
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Construct a comprehensive prompt with schema information
    const fullPrompt = `
You are an AI assistant that converts natural language requests into SQL queries.
Given the following database schema:
${JSON.stringify(databaseSchema, null, 2)}

${prompt}

IMPORTANT: Return your response as a valid JSON object with the following structure:
{
  "queries": [
    "SQL query 1;",
    "SQL query 2;",
    ...
  ]
}

Guidelines:
1. Each query in the array must be a complete, valid SQL statement ending with a semicolon.
2. Each query must be executable independently in MySQL.
3. Do not include newlines or special formatting within the queries.
4. Do not include code blocks or markdown, just the JSON object.
5. Each query should be a string with proper escaping.
6. If only one operation is needed, the queries array will have just one element.
7. If the table is already present in the schema then do not create new table, give sql query considering the old table fields only.
8. Do not modify the table fields if already present also do not give sql query with 'not exists' or similar clause.
9. For INSERT operations to insert records which are not specified in the request, insert records like the ones already present in that table. Use realistic values everywhere.
10. While creating table if id field is present in it and not a foreign key then set it to auto increment by default.
`;

    // Save the full prompt for debugging
    const debugPrompt = fullPrompt;

    // Generate content using the full prompt
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // Save the raw response for debugging
    const rawResponse = text;

    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;

      // Parse the JSON response
      const parsedResponse = JSON.parse(jsonString);

      // Return the array of queries along with the raw response and full prompt
      if (parsedResponse.queries && Array.isArray(parsedResponse.queries)) {
        return {
          queries: parsedResponse.queries,
          rawResponse: rawResponse,
          fullPrompt: debugPrompt,
        };
      } else {
        console.error("Invalid JSON structure returned from Gemini API");
        return {
          queries: [
            text
              .trim()
              .replace(/```sql|```/g, "")
              .trim(),
          ],
          rawResponse: rawResponse,
          fullPrompt: debugPrompt,
        };
      }
    } catch (jsonError) {
      console.error("Failed to parse JSON from Gemini response:", jsonError);
      // Fallback to the previous method
      const cleanedText = text
        .trim()
        .replace(/```sql|```/g, "")
        .trim();
      const numberedQueryPattern = /^\d+\.\s+(.+?)(?=^\d+\.|\Z)/gms;
      const matches = [...cleanedText.matchAll(numberedQueryPattern)];

      if (matches.length > 0) {
        return {
          queries: matches.map((match) => match[1].trim()),
          rawResponse: rawResponse,
          fullPrompt: debugPrompt,
        };
      } else {
        return {
          queries: [cleanedText],
          rawResponse: rawResponse,
          fullPrompt: debugPrompt,
        };
      }
    }
  } catch (error) {
    console.error("Error generating SQL queries:", error);
    throw new Error(`Failed to generate SQL queries: ${error.message}`);
  }
}

// Function to validate the generated SQL query
async function validateQuery(query) {
  try {
    // Basic validation to prevent SQL injection
    if (query.includes(";") && !query.endsWith(";")) {
      // Multiple statements are not allowed
      return {
        valid: false,
        message: "Multiple SQL statements are not allowed.",
      };
    }

    // Check for common SQL injection patterns
    const suspiciousPatterns = [
      "--",
      "/*",
      "UNION",
      "DROP",
      "TRUNCATE",
      "ALTER",
      "GRANT",
      "REVOKE",
      "EXEC",
      "xp_",
    ];

    for (const pattern of suspiciousPatterns) {
      if (query.toLowerCase().includes(pattern.toLowerCase())) {
        return {
          valid: false,
          message: `Potentially harmful SQL pattern detected: ${pattern}`,
        };
      }
    }

    return {
      valid: true,
      query: query,
    };
  } catch (error) {
    console.error("Error validating query:", error);
    return {
      valid: false,
      message: `Validation error: ${error.message}`,
    };
  }
}

module.exports = {
  generateSQLQuery,
  generateSQLQueries,
  validateQuery,
};
