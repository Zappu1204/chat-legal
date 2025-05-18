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
from langchain_core.embeddings.embeddings import Embeddings
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
# Update embedding model to use E5-Mistral-7B-Instruct
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "intfloat/e5-mistral-7b-instruct")
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://ollama:11434/api/generate")
OLLAMA_API_BASE = os.getenv("OLLAMA_API_BASE", "http://ollama:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.1:8b")
TOP_K = int(os.getenv("TOP_K", "5"))

# Define the task description for search instruction
SEARCH_INSTRUCTION = "Tìm kiếm các thông tin pháp luật về giao thông đường bộ"

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

# Define a separate embedding class for E5-Mistral
class E5MistralEmbeddings(Embeddings):
    """Custom embedding class for E5-Mistral model"""
    
    def __init__(self):
        """Initialize the embedding model"""
        self.model_name = EMBEDDING_MODEL
        self.sentence_transformer = SentenceTransformer(EMBEDDING_MODEL)
        self.sentence_transformer.max_seq_length = 512
        logger.info(f"Initialized E5MistralEmbeddings with model: {self.model_name}")
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of documents"""
        try:
            embeddings = []
            batch_size = 8  # Small batch size to manage memory
            
            # Process in batches
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i+batch_size]
                batch_embeddings = self.sentence_transformer.encode(
                    batch, 
                    normalize_embeddings=True,
                    show_progress_bar=False
                )
                # Convert numpy arrays to lists
                if isinstance(batch_embeddings, np.ndarray):
                    batch_embeddings = batch_embeddings.tolist()
                embeddings.extend(batch_embeddings)
            
            return embeddings
        except Exception as e:
            logger.error(f"Error in embed_documents: {str(e)}")
            raise
    
    def embed_query(self, text: str) -> List[float]:
        """Embed a query with proper instruction format"""
        try:
            # Format the query with instruction as required by the model
            instructed_query = f"Instruct: {SEARCH_INSTRUCTION}\nQuery: {text}"
            embedding = self.sentence_transformer.encode(
                instructed_query, 
                normalize_embeddings=True,
                show_progress_bar=False
            )
            # Convert to list if it's a numpy array
            if isinstance(embedding, np.ndarray):
                embedding = embedding.tolist()
            return embedding
        except Exception as e:
            logger.error(f"Error in embed_query: {str(e)}")
            raise

class RAGProcessor:
    def __init__(self, data_path: str = LAW_DATA_PATH):
        """Initialize the RAG processor with the base path for finding law data"""
        self.data_path = data_path
        self.embeddings = None
        self.vectorstore = None
        self.documents = []
        self.sentence_transformer_model = None

    def clean_text(self, text: str) -> str:
        """Clean text by removing unnecessary whitespace and special characters"""
        # Replace \r\n with spaces
        text = re.sub(r'\r\n', ' ', text)
        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def load_and_chunk_data(self) -> List[Document]:
        """
        Load the law data from all JSON files in the data/json directory and chunk it into Langchain Documents
        Returns:
            List of Document objects with content and metadata
        """
        try:
            documents = []
            data_dir = os.path.join(os.path.dirname(self.data_path), "json")
            
            # Get all JSON files in the data/json directory
            json_files = [f for f in os.listdir(data_dir) if f.endswith('.json')]
            logger.info(f"Found {len(json_files)} JSON files in {data_dir}")
            
            # Define text splitter for chunking long texts
            # Smaller chunk size to ensure it fits within the model's max_seq_length
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=400,  # Smaller chunks to ensure they fit within the 512 token limit
                chunk_overlap=50,
                length_function=len,
            )
            
            for json_file in json_files:
                file_path = os.path.join(data_dir, json_file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        law_data = json.load(f)
                    
                    # Extract file name without extension as source identifier
                    source_name = os.path.splitext(json_file)[0]
                    
                    file_documents = []
                    
                    for chapter in law_data.get("chapters", []):
                        chapter_title = chapter.get("chapter_title", "")
                        
                        for article in chapter.get("articles", []):
                            article_title = article.get("article_title", "")
                            
                            # Combine all content items into a single text
                            content = ""
                            for content_item in article.get("content", []):
                                clean_content = self.clean_text(content_item)
                                content += clean_content + " "
                            
                            # Skip empty content
                            if not content.strip():
                                continue
                                
                            # Create metadata
                            metadata = {
                                "source_file": source_name,
                                "chapter_title": chapter_title,
                                "article_title": article_title,
                                "source": f"{source_name}: {chapter_title}, {article_title}"
                            }
                            
                            # Create a document
                            doc = Document(page_content=content.strip(), metadata=metadata)
                            file_documents.append(doc)
                    
                    # Split documents into chunks if they're too long
                    chunked_documents = []
                    for doc in file_documents:
                        if len(doc.page_content) > 400:  # Only split if longer than our chunk size
                            chunks = text_splitter.split_text(doc.page_content)
                            for i, chunk in enumerate(chunks):
                                # Create a new document for each chunk with the same metadata
                                chunked_doc = Document(
                                    page_content=chunk,
                                    metadata={
                                        **doc.metadata,
                                        "chunk": i+1,
                                        "total_chunks": len(chunks)
                                    }
                                )
                                chunked_documents.append(chunked_doc)
                        else:
                            chunked_documents.append(doc)
                    
                    documents.extend(chunked_documents)
                    logger.info(f"Processed {json_file}: added {len(chunked_documents)} documents")
                except Exception as e:
                    logger.error(f"Error processing file {json_file}: {str(e)}")
                    continue
            
            logger.info(f"Total loaded and chunked data: {len(documents)} documents created from {len(json_files)} files")
            return documents
        
        except Exception as e:
            logger.error(f"Error loading or chunking data: {str(e)}")
            raise

    def initialize_embeddings(self):
        """Initialize embeddings for Langchain"""
        try:
            logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
            
            # For E5-Mistral-7B model, use our dedicated class
            if "e5-mistral" in EMBEDDING_MODEL.lower():
                self.embeddings = E5MistralEmbeddings()
            else:
                # Fallback to regular HuggingFaceEmbeddings for other models
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
                
            # Check if there are documents to process
            if not documents:
                logger.warning("No documents to build vectorstore")
                return
                
            logger.info(f"Building vectorstore with {len(documents)} documents")
            
            # Process in batches to prevent memory issues with large document sets
            batch_size = 50  # Adjust based on memory constraints
            all_batches = []
            
            for i in range(0, len(documents), batch_size):
                end_idx = min(i + batch_size, len(documents))
                batch = documents[i:end_idx]
                logger.info(f"Processing batch {i//batch_size + 1}/{(len(documents)-1)//batch_size + 1} ({len(batch)} documents)")
                
                # Create a small vectorstore for this batch
                batch_vectorstore = LangchainFAISS.from_documents(
                    documents=batch,
                    embedding=self.embeddings
                )
                all_batches.append(batch_vectorstore)
            
            # Merge all batch vectorstores if there are multiple batches
            if len(all_batches) > 1:
                self.vectorstore = all_batches[0]
                for batch_vs in all_batches[1:]:
                    self.vectorstore.merge_from(batch_vs)
            else:
                self.vectorstore = all_batches[0]
                
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

    def force_rebuild_vectorstore(self):
        """Force a rebuild of the vectorstore from source data without attempting to load existing data"""
        try:
            logger.info("Forcing rebuild of vectorstore...")
            
            # Initialize embeddings if not already done
            if self.embeddings is None:
                self.initialize_embeddings()
            
            # Load and chunk data
            self.documents = self.load_and_chunk_data()
            
            if not self.documents or len(self.documents) == 0:
                logger.warning("No documents were loaded to build the vectorstore")
                return False
            
            # Build vectorstore
            self.build_vectorstore(self.documents)
            
            # Save vectorstore
            self.save_vectorstore()
            
            return True
        except Exception as e:
            logger.error(f"Error forcing rebuild of vectorstore: {str(e)}")
            raise

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