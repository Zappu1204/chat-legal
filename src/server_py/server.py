#!/usr/bin/env python
import uvicorn
import logging
import time
import sys
from app.main import app
from app.db.database import check_and_create_database
from app.db.db_setup import ensure_database_exists, create_tables
from app.db.init_db import init_db
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("server.log")
    ]
)
logger = logging.getLogger(__name__)

def main():
    """
    Main entry point for the application
    """
    logger.info("=== Starting ViVu Chat API Server ===")
    
    # First ensure database exists
    if not ensure_database_exists():
        logger.error("Failed to ensure database exists. Exiting...")
        sys.exit(1)
    
    # Then create tables
    if not create_tables():
        logger.error("Failed to create database tables. Exiting...")
        sys.exit(1)
        
    try:
        # Initialize database with roles and admin user
        logger.info("Initializing database with initial data...")
        init_db()
        logger.info(f"Database {settings.POSTGRES_DB} is ready!")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        logger.warning("Starting server anyway, but some functionality may not work...")
    
    # Start the FastAPI application with Uvicorn
    logger.info("Starting PTIT Chat API server...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,  # Enable auto-reload during development
    )

if __name__ == "__main__":
    main()