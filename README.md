# PTIT Chat - Trợ lý Luật Giao thông Đường bộ

PTIT Chat là một ứng dụng chatbot AI sử dụng công nghệ RAG (Retrieval-Augmented Generation) để tra cứu và cung cấp thông tin về Luật Giao thông Đường bộ Việt Nam. Ứng dụng kết hợp sức mạnh của mô hình ngôn ngữ lớn với cơ sở dữ liệu pháp luật có cấu trúc để cung cấp câu trả lời chính xác, đáng tin cậy và có trích dẫn nguồn.

## Tính năng

- 🔍 Tìm kiếm và trả lời thông tin về luật giao thông với RAG
- 🤖 Tích hợp với mô hình ngôn ngữ lớn thông qua Ollama
- 💬 Giao diện chat với hiển thị tin nhắn theo thời gian thực
- 📚 Quản lý lịch sử trò chuyện và tài khoản người dùng
- 🔄 Khả năng chuyển đổi giữa chế độ chat thông thường và chế độ RAG
- 📱 Thiết kế responsive cho máy tính và thiết bị di động
- 📊 Quản lý và hiển thị nguồn tài liệu pháp luật

## Công nghệ sử dụng

### Frontend

- React 19 với TypeScript
- TailwindCSS cho styling
- React Router cho điều hướng
- Vite cho build tool
- Axios cho gọi API

### Backend

- FastAPI (Python) cho RESTful API
- SQLAlchemy cho ORM và tương tác cơ sở dữ liệu
- LangChain để xử lý RAG
- FAISS cho vector database
- HuggingFace Embeddings để vector hóa văn bản
- JWT cho xác thực người dùng

### Cơ sở hạ tầng

- Docker & Docker Compose
- Ollama để chạy mô hình ngôn ngữ lớn
- NGINX làm reverse proxy

## Yêu cầu

- Docker & Docker Compose
- Git
- NVIDIA GPU với hỗ trợ CUDA (khuyến nghị nhưng không bắt buộc)

## Khởi động nhanh với Docker

Cách nhanh nhất để khởi động là sử dụng Docker Compose:

```bash
# Clone repository
git clone https://github.com/yourusername/chat-legal.git
cd chat-legal

# Khởi động các dịch vụ
cd src
docker-compose up -d

# Tải một mô hình AI (sau khi các dịch vụ đã chạy)
docker exec -it chatbot-ollama ollama pull llama3.1:8b
```

Sau khi các dịch vụ đang chạy, truy cập:
- Web App: http://localhost
- API: http://localhost:8000
- Ollama: http://localhost:11434

## Chạy trên Apple Silicon (M1/M2)

Đối với người dùng Mac có chip Apple Silicon (M1/M2), cấu hình Docker của chúng tôi hỗ trợ kiến trúc ARM64:

```bash
# Clone repository
git clone https://github.com/yourusername/chat-legal.git
cd chat-legal

# Chỉnh sửa docker-compose.yml để sử dụng kiến trúc ARM64
# Thay đổi giá trị BUILDPLATFORM từ linux/amd64 thành linux/arm64

# Khởi động các dịch vụ
cd src
docker-compose up -d

# Tải mô hình AI được tối ưu hóa cho ARM
docker exec -it chatbot-ollama ollama pull llama3.1:8b
```

## Kiến trúc RAG

Dự án sử dụng kiến trúc RAG (Retrieval-Augmented Generation) để tăng độ chính xác của câu trả lời về luật giao thông:

1. **Thu thập dữ liệu**: Luật Giao thông Đường bộ được cấu trúc thành JSON
2. **Xử lý dữ liệu**: Tài liệu được chia thành đoạn nhỏ và chuyển đổi thành vector embedding
3. **Vector database**: FAISS lưu trữ và đánh chỉ mục các vector embedding
4. **Retrieval**: Khi có câu hỏi, hệ thống tìm kiếm các đoạn văn bản liên quan nhất
5. **Generation**: LLM tạo câu trả lời dựa trên ngữ cảnh tìm được
6. **Trích dẫn**: Câu trả lời được trả về kèm theo nguồn tài liệu pháp lý

## Cài đặt môi trường phát triển

### Frontend (Local)

```bash
cd src/client

# Cài đặt dependencies
npm install

# Khởi động server phát triển
npm run dev

# Build cho production
npm run build
```

### Backend Python (Local)

```bash
cd src/server_py

# Tạo và kích hoạt môi trường ảo
python -m venv venv
source venv/bin/activate  # Trên Windows: venv\Scripts\activate

# Cài đặt dependencies
pip install -r requirements.txt

# Khởi động ứng dụng
python server.py
```

## Quản lý mô hình Ollama

Ollama hỗ trợ nhiều mô hình AI khác nhau. Để sử dụng một mô hình khác:

```bash
# Liệt kê các mô hình có sẵn
docker exec -it chatbot-ollama ollama list

# Tải mô hình mới
docker exec -it chatbot-ollama ollama pull llama3.1:8b
docker exec -it chatbot-ollama ollama pull gemma:7b

# Đối với mô hình lớn hơn (nếu bạn có đủ RAM GPU)
docker exec -it chatbot-ollama ollama pull mixtral:8x7b
```

Sau khi đã tải mô hình, bạn có thể chọn chúng trong giao diện của PTIT Chat.

## Xây dựng cơ sở dữ liệu RAG

Để tạo mới hoặc cập nhật vector database từ dữ liệu nguồn:

1. Đảm bảo dữ liệu nguồn (luật giao thông) được định dạng đúng trong `app/data/luat_giao_thong_struct.json`
2. Truy cập giao diện quản lý RAG trong ứng dụng
3. Nhấp vào nút "Xây dựng Vector DB" để tạo chỉ mục mới
4. Kiểm tra trạng thái để xác nhận việc xây dựng đã hoàn tất

Hoặc thực hiện thông qua API:

```bash
# Xây dựng vector database qua API
curl -X POST http://localhost:8000/api/rag/build-index \
  -H "Authorization: Bearer your_access_token" \
  -H "Content-Type: application/json"
```

## Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng làm theo các bước sau:

1. Fork repository
2. Tạo nhánh tính năng (`git checkout -b feature/amazing-feature`)
3. Commit thay đổi của bạn (`git commit -m 'Add some amazing feature'`)
4. Push lên nhánh (`git push origin feature/amazing-feature`)
5. Mở Pull Request

## Giấy phép

Dự án này được cấp phép theo [Giấy phép MIT](LICENSE).

