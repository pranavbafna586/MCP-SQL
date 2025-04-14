import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Text, select, insert
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()

# MySQL connection configuration
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "mcp_demo")

# Create the SQLAlchemy engine
DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
engine = create_engine(DATABASE_URL)

# Create base model class
Base = declarative_base()

# Define the session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Database models
class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    content = Column(Text)
    metadata = Column(Text, nullable=True)


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


def get_db_session():
    """Get database session"""
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()


def add_document(title, content, metadata=None):
    """Add a document to the database"""
    db = get_db_session()
    try:
        new_doc = Document(title=title, content=content, metadata=metadata)
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        return new_doc
    finally:
        db.close()


def get_all_documents():
    """Get all documents from the database"""
    db = get_db_session()
    try:
        docs = db.query(Document).all()
        return docs
    finally:
        db.close()


def search_documents(query):
    """Search documents with simple string matching"""
    db = get_db_session()
    try:
        docs = db.query(Document).filter(Document.content.contains(query)).all()
        return docs
    finally:
        db.close()