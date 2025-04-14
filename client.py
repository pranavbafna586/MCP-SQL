import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Server configuration
host = os.getenv("MCP_SERVER_HOST", "0.0.0.0")
port = os.getenv("MCP_SERVER_PORT", "8000")
url = f"http://{host}:{port}/v1/chat/completions"

def send_message(message):
    """Send a message to the MCP server and get the response."""
    headers = {"Content-Type": "application/json"}
    data = {
        "messages": [
            {"role": "user", "content": message}
        ]
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()  # Raise an exception for HTTP errors
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        return None

def main():
    print("MCP MySQL AI Agent Client")
    print("Type 'exit' to quit")
    print("=" * 50)
    
    while True:
        user_input = input("\nYour message: ")
        
        if user_input.lower() == 'exit':
            print("Goodbye!")
            break
        
        # Send message to server
        response = send_message(user_input)
        
        if response:
            try:
                assistant_message = response["choices"][0]["message"]["content"]
                print("\nAssistant:", assistant_message)
            except (KeyError, IndexError):
                print("\nError: Invalid response format")
                print(f"Response: {json.dumps(response, indent=2)}")
        else:
            print("\nNo response received from server")

if __name__ == "__main__":
    main()