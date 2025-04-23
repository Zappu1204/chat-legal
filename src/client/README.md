# PTIT Chat - Trợ lý Luật Giao thông Đường bộ

Ứng dụng chatbot sử dụng RAG (Retrieval-Augmented Generation) cho việc tư vấn và tra cứu thông tin về Luật Giao thông Đường bộ Việt Nam.

## Tổng quan

PTIT Chat là một ứng dụng web hiện đại được phát triển bởi PTIT, sử dụng kiến trúc phân tách giữa frontend (React) và backend (Python) hỗ trợ:

- Trò chuyện thông thường với mô hình ngôn ngữ lớn thông qua Ollama
- Tra cứu pháp luật giao thông chính xác với RAG (Retrieval-Augmented Generation)
- Hiển thị nguồn dữ liệu pháp lý cho mỗi câu trả lời
- Xác thực và quản lý người dùng
- Giao diện người dùng thân thiện, hỗ trợ đầy đủ trên máy tính và thiết bị di động

## Công nghệ

### Frontend
- **React 19** với TypeScript
- **Vite** làm công cụ build
- **TailwindCSS** cho styling
- **React Router** cho điều hướng
- **Axios** cho gọi API
- **React Markdown** để hiển thị nội dung định dạng

### Backend
- **FastAPI** (Python) cho REST API
- **SQLAlchemy** cho ORM và tương tác cơ sở dữ liệu
- **LangChain** cho xử lý RAG
- **FAISS** cho vector database
- **HuggingFace Embeddings** để tạo vector embedding
- **Ollama** để tích hợp với LLMs

## Tính năng

- **Xác thực**: Đăng nhập, đăng ký, quản lý phiên người dùng
- **Chat thông thường**: Trò chuyện với mô hình ngôn ngữ lớn
- **Chế độ RAG**: Tìm kiếm và trả lời câu hỏi dựa trên cơ sở dữ liệu luật pháp
- **Quản lý cơ sở dữ liệu**: Xây dựng và cập nhật vector database từ tài liệu luật
- **Lịch sử trò chuyện**: Lưu trữ và quản lý các cuộc trò chuyện
- **Chức năng quản trị**: Quản lý người dùng, mô hình và cơ sở dữ liệu

## Cài đặt và Chạy

### Yêu cầu
- Node.js 18+ (frontend)
- Python 3.10+ (backend)
- Ollama (model server)
- Docker & Docker Compose (tùy chọn)

### Phát triển

Khởi chạy frontend:
```bash
cd client
npm install
npm run dev
```

Khởi chạy backend:
```bash
cd server_py
pip install -r requirements.txt
python server.py
```

### Triển khai với Docker
```bash
cd src
docker-compose up -d
```

## Kiến trúc RAG

Dự án sử dụng kiến trúc RAG (Retrieval-Augmented Generation) để cải thiện độ chính xác của câu trả lời về luật giao thông:

1. **Tài liệu nguồn**: Luật Giao thông Đường bộ được cấu trúc thành JSON
2. **Indexing**: Tài liệu được chia nhỏ và vector hóa bằng mô hình embedding
3. **Tìm kiếm**: Truy vấn người dùng được so khớp với các đoạn văn bản có liên quan nhất
4. **Tổng hợp**: LLM tạo câu trả lời dựa trên ngữ cảnh tìm được
5. **Trích dẫn nguồn**: Câu trả lời kèm theo nguồn tài liệu pháp lý

## Liên hệ

Để biết thêm thông tin về dự án, vui lòng liên hệ [thông tin liên hệ dự án].
