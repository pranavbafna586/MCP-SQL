import os
from dotenv import load_dotenv
import db_connector

# Load environment variables
load_dotenv()

def populate_sample_data():
    """Populate the database with sample documents for testing."""
    print("Initializing database...")
    db_connector.init_db()
    
    # Sample documents
    sample_docs = [
        {
            "title": "Introduction to Data Science",
            "content": """Data science is an interdisciplinary field that uses scientific methods, processes, algorithms and systems 
            to extract knowledge and insights from structured and unstructured data. It employs techniques and theories drawn from 
            many fields within the context of mathematics, statistics, computer science, and information science.""",
            "metadata": '{"category": "education", "tags": ["data science", "machine learning", "statistics"]}'
        },
        {
            "title": "MySQL Database Management",
            "content": """MySQL is an open-source relational database management system. Its name is a combination of "My", 
            the name of co-founder Michael Widenius's daughter, and "SQL", the abbreviation for Structured Query Language. 
            MySQL is free and open-source software under the terms of the GNU General Public License.""",
            "metadata": '{"category": "technology", "tags": ["database", "SQL", "RDBMS"]}'
        },
        {
            "title": "Python Programming for Beginners",
            "content": """Python is an interpreted, high-level, general-purpose programming language. Python's design philosophy 
            emphasizes code readability with its notable use of significant whitespace. Its language constructs and object-oriented 
            approach aim to help programmers write clear, logical code for small and large-scale projects.""",
            "metadata": '{"category": "education", "tags": ["programming", "python", "coding"]}'
        },
        {
            "title": "Artificial Intelligence Overview",
            "content": """Artificial intelligence (AI) is intelligence demonstrated by machines, unlike the natural intelligence 
            displayed by humans and animals. Leading AI textbooks define the field as the study of "intelligent agents": any device 
            that perceives its environment and takes actions that maximize its chance of successfully achieving its goals.""",
            "metadata": '{"category": "technology", "tags": ["AI", "machine learning", "neural networks"]}'
        },
        {
            "title": "Cloud Computing Services",
            "content": """Cloud computing is the on-demand availability of computer system resources, especially data storage and 
            computing power, without direct active management by the user. The term is generally used to describe data centers 
            available to many users over the Internet.""",
            "metadata": '{"category": "technology", "tags": ["cloud", "AWS", "Azure", "GCP"]}'
        }
    ]
    
    # Add sample documents to the database
    print("Adding sample documents to the database...")
    for doc in sample_docs:
        db_connector.add_document(doc["title"], doc["content"], doc["metadata"])
    
    print(f"Successfully added {len(sample_docs)} sample documents to the database.")
    
    # Verify documents were added
    all_docs = db_connector.get_all_documents()
    print(f"Total documents in database: {len(all_docs)}")
    
    print("\nSample document titles:")
    for doc in all_docs:
        print(f"- {doc.title}")
    
    print("\nDatabase initialization complete!")

if __name__ == "__main__":
    populate_sample_data()