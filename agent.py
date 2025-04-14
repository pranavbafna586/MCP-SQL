import os
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional

from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import StructuredTool
from langchain.schema import SystemMessage

import db_connector

# Load environment variables
load_dotenv()

# Initialize the OpenAI model
llm = ChatOpenAI(
    model="gpt-4-turbo",
    temperature=0,
    api_key=os.getenv("OPENAI_API_KEY")
)

# Define database tools for the agent
def search_mysql_db(query: str) -> List[Dict[str, Any]]:
    """Search the MySQL database for documents matching the query."""
    docs = db_connector.search_documents(query)
    results = []
    for doc in docs:
        results.append({
            "id": doc.id,
            "title": doc.title,
            "content": doc.content,
            "metadata": doc.metadata
        })
    return results

def get_all_mysql_docs() -> List[Dict[str, Any]]:
    """Retrieve all documents from the MySQL database."""
    docs = db_connector.get_all_documents()
    results = []
    for doc in docs:
        results.append({
            "id": doc.id,
            "title": doc.title,
            "content": doc.content,
            "metadata": doc.metadata
        })
    return results

def add_mysql_doc(title: str, content: str, metadata: Optional[str] = None) -> Dict[str, Any]:
    """Add a new document to the MySQL database."""
    doc = db_connector.add_document(title, content, metadata)
    return {
        "id": doc.id,
        "title": doc.title,
        "content": doc.content,
        "metadata": doc.metadata
    }

# Create tools for the agent
tools = [
    StructuredTool.from_function(search_mysql_db),
    StructuredTool.from_function(get_all_mysql_docs),
    StructuredTool.from_function(add_mysql_doc)
]

# Create a system prompt
system_message = SystemMessage(
    content="""You are an AI assistant with access to a MySQL database.
    You can search for documents, retrieve all documents, and add new documents to the database.
    Use the tools available to you to help the user with their database queries.
    Always try to provide helpful, accurate, and concise responses."""
)

# Set up the prompt with conversation history
prompt = ChatPromptTemplate.from_messages([
    system_message,
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

# Set up conversation memory
memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

# Create the agent
agent = create_openai_tools_agent(
    llm=llm,
    tools=tools,
    prompt=prompt
)

# Create the agent executor
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory,
    verbose=True
)

def run_agent(query: str) -> Dict[str, Any]:
    """Run the agent with the given query."""
    try:
        response = agent_executor.invoke({"input": query})
        return {
            "response": response["output"],
            "success": True
        }
    except Exception as e:
        return {
            "error": str(e),
            "success": False
        }