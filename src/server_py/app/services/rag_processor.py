import json
import os
import pickle
import re
import logging
import time
import numpy as np
import requests
import faiss
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Tuple, Any, Optional

# Thêm các thư viện LangChain
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS as LangchainFAISS
from langchain.docstore.document import Document
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain_ollama import OllamaLLM

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration variables
LAW_DATA_PATH = os.getenv("LAW_DATA_PATH", "app/data/luat_giao_thong_struct.json")
FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "app/data/faiss_index.pkl")
METADATA_PATH = os.getenv("METADATA_PATH", "app/data/metadata.pkl")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "legalvn/paraphrase-multilingual-MiniLM-L12-v2-168000")
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://ollama:11434/api/generate")
OLLAMA_API_BASE = os.getenv("OLLAMA_API_BASE", "http://ollama:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.1:8b")
TOP_K = int(os.getenv("TOP_K", "5"))

# Định nghĩa template cho prompt
PROMPT_TEMPLATE = """
Bạn là một trợ lý AI chuyên về luật giao thông đường bộ Việt Nam.
Hãy sử dụng chỉ những ngữ cảnh sau đây để trả lời câu hỏi của người dùng.
Nếu thông tin không có trong ngữ cảnh, hãy nói rõ là bạn không tìm thấy thông tin liên quan trong luật giao thông.
Trả lời ngắn gọn, súc tích và có tính tư vấn, dễ hiểu cho người dùng.

Ngữ cảnh:
{context}

Câu hỏi: {question}

Trả lời:
"""

class RAGProcessor:
    def __init__(self, data_path: str = LAW_DATA_PATH):
        """Initialize the RAG processor with the path to the law data"""
        self.data_path = data_path
        self.embeddings = None
        self.vectorstore = None
        self.documents = []

    def clean_text(self, text: str) -> str:
        """Clean text by removing unnecessary whitespace and special characters"""
        # Replace \r\n with spaces
        text = re.sub(r'\r\n', ' ', text)
        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def load_and_chunk_data(self) -> List[Document]:
        """
        Load the law data from JSON and chunk it into Langchain Documents
        Returns:
            List of Document objects with content and metadata
        """
        try:
            with open(self.data_path, 'r', encoding='utf-8') as f:
                law_data = json.load(f)

            documents = []

            for chapter in law_data.get("chapters", []):
                chapter_title = chapter.get("chapter_title", "")
                
                for article in chapter.get("articles", []):
                    article_title = article.get("article_title", "")
                    
                    # Treat each content item as a separate chunk
                    for content_item in article.get("content", []):
                        # Clean the content text
                        clean_content = self.clean_text(content_item)
                        
                        # Create Langchain Document with metadata
                        doc = Document(
                            page_content=clean_content,
                            metadata={
                                "chapter_title": chapter_title,
                                "article_title": article_title,
                                "source": f"{chapter_title}, {article_title}"
                            }
                        )
                        documents.append(doc)
            
            logger.info(f"Loaded and chunked data: {len(documents)} documents created")
            return documents
        
        except Exception as e:
            logger.error(f"Error loading or chunking data: {str(e)}")
            raise

    def initialize_embeddings(self):
        """Initialize HuggingFace embeddings for Langchain"""
        try:
            logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
            model_kwargs = {'device': 'cpu'}
            encode_kwargs = {'normalize_embeddings': True}
            self.embeddings = HuggingFaceEmbeddings(
                model_name=EMBEDDING_MODEL,
                model_kwargs=model_kwargs,
                encode_kwargs=encode_kwargs
            )
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading embedding model: {str(e)}")
            raise

    def build_vectorstore(self, documents: List[Document]):
        """
        Build a FAISS vectorstore using Langchain
        Args:
            documents: List of Document objects
        """
        try:
            if self.embeddings is None:
                self.initialize_embeddings()
                
            # Create vectorstore
            self.vectorstore = LangchainFAISS.from_documents(
                documents=documents,
                embedding=self.embeddings
            )
            
            logger.info(f"Built FAISS vectorstore with {len(documents)} documents")
        except Exception as e:
            logger.error(f"Error building vectorstore: {str(e)}")
            raise

    def save_vectorstore(self):
        """Save the vectorstore to disk"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(FAISS_INDEX_PATH), exist_ok=True)
            
            # Save vectorstore
            self.vectorstore.save_local(FAISS_INDEX_PATH)
            logger.info(f"Saved vectorstore to {FAISS_INDEX_PATH}")
        except Exception as e:
            logger.error(f"Error saving vectorstore: {str(e)}")
            raise

    def load_vectorstore(self) -> bool:
        """
        Load the vectorstore from disk
        Returns:
            Boolean indicating whether loading was successful
        """
        try:
            # Check if files exist
            if not os.path.exists(FAISS_INDEX_PATH):
                logger.info("Vectorstore not found")
                return False
                
            if self.embeddings is None:
                self.initialize_embeddings()
                
            # Load vectorstore
            self.vectorstore = LangchainFAISS.load_local(
                FAISS_INDEX_PATH,
                self.embeddings,
                allow_dangerous_deserialization=True
            )
            
            logger.info(f"Loaded vectorstore successfully")
            return True
        except Exception as e:
            logger.error(f"Error loading vectorstore: {str(e)}")
            return False

    def build_or_load_vectorstore(self):
        """Build a new vectorstore or load an existing one"""
        # Try to load existing vectorstore
        if self.load_vectorstore():
            return
        
        # If loading failed, build a new vectorstore
        logger.info("Building new vectorstore...")
        
        # Initialize embeddings if not already done
        if self.embeddings is None:
            self.initialize_embeddings()
        
        # Load and chunk data
        self.documents = self.load_and_chunk_data()
        
        # Build vectorstore
        self.build_vectorstore(self.documents)
        
        # Save vectorstore
        self.save_vectorstore()

    def search(self, query: str, top_k: int = TOP_K) -> List[Dict[str, Any]]:
        """
        Search the vectorstore for the most similar chunks to the query
        Args:
            query: The user's query
            top_k: Number of results to return
        Returns:
            List of dictionaries containing the most relevant chunks and their metadata
        """
        try:
            # Build or load vectorstore if needed
            if self.vectorstore is None:
                self.build_or_load_vectorstore()
            
            # Search vectorstore
            retriever = self.vectorstore.as_retriever(search_kwargs={"k": top_k})
            docs = retriever.invoke(query)
            
            # Format results
            results = []
            for doc in docs:
                results.append({
                    "chapter_title": doc.metadata.get("chapter_title", ""),
                    "article_title": doc.metadata.get("article_title", ""),
                    "content": doc.page_content,
                    "source": doc.metadata.get("source", "")
                })
            
            logger.info(f"Found {len(results)} search results for query: {query}")
            return results
        except Exception as e:
            logger.error(f"Error during search: {str(e)}")
            return []

    def format_context(self, contexts: List[Dict[str, Any]]) -> str:
        """
        Format context list into a single string for the prompt
        """
        context_parts = []
        for i, ctx in enumerate(contexts):
            context_text = f"Nguồn {i+1}: {ctx['chapter_title']}, {ctx['article_title']}\n{ctx['content']}"
            context_parts.append(context_text)
        
        return "\n\n".join(context_parts)

    def create_chain(self):
        """
        Create a RetrievalQA chain with the vectorstore and Ollama
        """
        try:
            # Configure Ollama LLM
            llm = OllamaLLM(model=LLM_MODEL, base_url=OLLAMA_API_BASE)
            
            # Create prompt template
            prompt = PromptTemplate(
                template=PROMPT_TEMPLATE,
                input_variables=["context", "question"]
            )
            
            # Create retriever if needed
            if self.vectorstore is None:
                self.build_or_load_vectorstore()
                
            retriever = self.vectorstore.as_retriever(search_kwargs={"k": TOP_K})
            
            # Create chain
            chain = RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",
                retriever=retriever,
                return_source_documents=True,
                chain_type_kwargs={"prompt": prompt}
            )
            
            return chain
        except Exception as e:
            logger.error(f"Error creating chain: {str(e)}")
            raise

    def generate_answer(self, query: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Generate an answer to the user's query using the LangChain RAG pipeline
        Args:
            query: The user's query
        Returns:
            Tuple containing the generated answer and the source chunks
        """
        try:
            start_time = time.time()
            
            # Method 1: Using RetrievalQA chain
            try:
                chain = self.create_chain()
                result = chain.invoke({"query": query})
                answer = result.get("result", "")
                source_docs = result.get("source_documents", [])
                
                # Format source documents
                sources = []
                for doc in source_docs:
                    sources.append({
                        "chapter_title": doc.metadata.get("chapter_title", ""),
                        "article_title": doc.metadata.get("article_title", ""),
                        "content": doc.page_content
                    })
                
                logger.info(f"Generated answer using RetrievalQA chain in {time.time() - start_time:.2f} seconds")
                return answer, sources
            
            # Method 2: Fallback to manual approach if chain fails
            except Exception as chain_error:
                logger.warning(f"Chain failed, falling back to manual approach: {str(chain_error)}")
                
                # Search for relevant chunks
                search_results = self.search(query)
                
                if not search_results:
                    return "Tôi không tìm thấy thông tin liên quan trong luật giao thông.", []
                
                # Format context
                context_str = self.format_context(search_results)
                
                # Format the complete prompt
                prompt = PROMPT_TEMPLATE.format(context=context_str, question=query)
                
                # Create the Ollama API payload
                payload = {
                    "model": LLM_MODEL,
                    "prompt": prompt,
                    "stream": False
                }
                
                # Call Ollama API
                response = requests.post(OLLAMA_API_URL, json=payload)
                
                if response.status_code != 200:
                    logger.error(f"Error from Ollama API: {response.text}")
                    return "Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi của bạn.", []
                
                # Extract the generated text
                answer = response.json().get("response", "")
                
                logger.info(f"Generated answer using manual approach in {time.time() - start_time:.2f} seconds")
                return answer, search_results
                
        except Exception as e:
            logger.error(f"Error generating answer: {str(e)}")
            return "Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi của bạn.", []