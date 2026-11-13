# Kế Hoạch Nghiệp Vụ & Thiết Kế Task: Phân Hệ AI RAG Phân Tích Báo Cáo & Tư Vấn Tối Ưu Lợi Nhuận (`rag-advisor`)

> **Căn cứ:**
>
> - [AGENTS.md](file:///d:/Studying/FALL2026/self-storage-system-be/.agents/rules/AGENTS.md)
> - [business-rules-current.md](file:///d:/Studying/FALL2026/self-storage-system-be/docs/agent/rag-advisor/business-rules-current.md)
> - Kế thừa trực tiếp từ dữ liệu tổng hợp của phân hệ [`statistics`](file:///d:/Studying/FALL2026/self-storage-system-be/src/modules/statistics/statistics.service.ts) (`overview`, `rental-trends`, `facilities-kpi`, `financial-analytics`, `product-and-operations`) và Sổ tay Quy tắc Nghiệp vụ Chuỗi Kho Tự Quản ([BUSINESS_RULES_HANDBOOK.md](file:///d:/Studying/FALL2026/self-storage-system-be/docs/agent/BUSINESS_RULES_HANDBOOK.md)).

---

## 1. Mục Tiêu & Phạm Vi Phân Hệ

Xây dựng hệ thống **RAG Profit Advisor** ngay trong module [`src/modules/statistics/`](file:///d:/Studying/FALL2026/self-storage-system-be/src/modules/statistics/statistics.service.ts) (không phát sinh bảng MongoDB mới — Zero DB Migration), giúp đội ngũ điều hành (`BUSINESS_OPS_MANAGER`, `SYSTEM_ADMIN`, `FACILITY_MANAGER`) đặt câu hỏi hoặc yêu cầu phân tích báo cáo để nhận hướng dẫn hành động tăng lợi nhuận, đáp ứng trọn vẹn **8 tiêu chuẩn kỹ thuật RAG**:

1. **System Prompt chặt chẽ (Strict Grounded System Prompt):** Khóa vai trò Chuyên gia Tối ưu Lợi nhuận Kho Tự Quản, ép trả về JSON chuẩn Zod kèm trích dẫn `[Chunk-ID]`.
2. **Dựng RAG & Cắt tài liệu đúng (Semantic Chunking & Hybrid Retrieval):** Trước mỗi câu trả lời, tự động cắt 5 báo cáo thống kê trong kỳ + Sổ tay chiến lược vận hành thành các đoạn ngữ nghĩa độc lập (`Chunks`), kết hợp tìm kiếm Vector (`gemini-embedding-001`) + từ khóa (`BM25`) để lấy đúng **Top-K (`K = 5`) chunks** liên quan nhất.
3. **Phân quyền 2 lớp & Bảo mật (RBAC-Scoped RAG — Rule 14 & Rule 23):** Chặn `CUSTOMER`/`FACILITY_STAFF` (`403`); tự động khóa phạm vi chunks và cache vào đúng `assignedFacilityId` đối với `FACILITY_MANAGER`; loại bỏ 100% dữ liệu cá nhân (Zero-PII).
4. **Phòng chống Prompt Injection (Multi-Layer Guardrails):** Quét và chặn tức thì các câu lệnh tiêm nhiễm/vượt quyền (`400 MESSAGE_CODE_821`) + cách ly câu hỏi người dùng trong thẻ XML `<user_query>`.
5. **Cache câu hỏi lặp lại (Redis Normalized Query Cache):** Chuẩn hóa câu hỏi và lưu kết quả trên Redis (`TTL = 30 phút`), phản hồi `< 5ms` với `0 token` cho các câu hỏi lặp lại; hỗ trợ cờ `refresh: true`.
6. **Model Router thông minh (`SIMPLE` vs `COMPLEX`):**
   - Câu hỏi dễ (tra cứu chỉ số, hỏi quy tắc) $\rightarrow$ định tuyến sang model nhỏ, nhanh **`gemini-3.5-flash-lite`**.
   - Câu hỏi khó (phân tích đa chiều, lập chiến lược tăng lợi nhuận) $\rightarrow$ định tuyến sang model lớn **`gemini-3.8-flash`**.
7. **Strict Grounding — Không bịa số liệu & Chặn câu hỏi ngoài lề:**
   - Hỏi ngoài phạm vi kho bãi/kinh doanh $\rightarrow$ trả về `OUT_OF_SCOPE_REJECTED`.
   - Hỏi chỉ số không có trong hệ thống (lương nhân sự, tiền quảng cáo...) $\rightarrow$ trả về `INSUFFICIENT_DATA`, tuyệt đối không đoán mò.
8. **Đảm bảo Đánh giá chất lượng (Automated RAG Evaluation Suite):** Cung cấp API `GET /statistics/ai-rag-eval` và bộ test kiểm định tự động 5 chỉ số trên Golden Dataset (Retrieval Hit Rate, Citation Faithfulness, Router Accuracy, Guardrail Defense Rate, Cache Hit).

---

## 2. Hướng Dẫn Đăng Ký & Cấu Hình Gemini API Key (Miễn Phí 100%)

Chỉ với **1 mã API Key duy nhất** trên Google AI Studio, hệ thống sử dụng được đồng thời cả **3 models miễn phí** (`gemini-embedding-001`, `gemini-3.5-flash-lite`, `gemini-3.8-flash`).

### Bước 1: Lấy API Key miễn phí trên Google AI Studio

1. Truy cập trang chính thức của Google AI Studio: **https://aistudio.google.com/apikey**
2. Đăng nhập bằng tài khoản **Google (Gmail)** cá nhân của bạn.
3. Nhấn nút **"Create API key"** (Tạo khóa API):
   - Chọn **"Create API key in new project"** (hoặc chọn một Google Cloud project có sẵn — **không cần liên kết thẻ tín dụng**).
4. Sao chép chuỗi API Key vừa sinh ra (bắt đầu bằng `AIzaSy...`).

### Bước 2: Kiểm tra hạn mức gói Miễn phí (Free Tier) của 3 Models

Cùng một `GEMINI_API_KEY` đó sẽ tự động gọi được cả 3 endpoints REST chuẩn của Google Gemini:

- **Model Embedding (Tạo vector tìm kiếm):** `gemini-embedding-001`
  - Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent`
  - Hạn mức Free Tier: ~1.500 requests/phút (Miễn phí 100%).
- **Model Nhỏ cho Câu hỏi dễ & Router:** `gemini-3.5-flash-lite`
  - Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`
  - Hạn mức Free Tier: ~15–30 requests/phút, ~1.000–1.500 requests/ngày (Miễn phí 100%).
- **Model Lớn cho Câu hỏi khó / Tư vấn Chiến lược Lợi nhuận:** `gemini-3.8-flash`
  - Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`
  - Hạn mức Free Tier: ~15 requests/phút, ~500–1.500 requests/ngày (Miễn phí 100%).

### Bước 3: Khai báo vào file `.env` của dự án Backend

Mở file `.env` ở thư mục gốc dự án (`d:\Studying\FALL2026\self-storage-system-be\.env`) và thêm các biến sau:

```env
# ==========================================
# GOOGLE GEMINI AI & RAG ADVISOR (FREE TIER)
# ==========================================
GEMINI_API_KEY=AIzaSy_DÁN_MÃ_API_KEY_CỦA_BẠN_VÀO_ĐÂY
STATISTICS_RAG_EMBEDDING_MODEL=gemini-embedding-001
STATISTICS_RAG_FAST_MODEL=gemini-3.5-flash-lite
STATISTICS_RAG_REASONING_MODEL=gemini-3.8-flash
STATISTICS_RAG_TOP_K=5
STATISTICS_RAG_CACHE_TTL_SECONDS=1800
STATISTICS_RAG_TIMEOUT_MS=15000
```

> [!TIP]
> **Chế độ An toàn khi chưa điền `GEMINI_API_KEY`:** Ngay cả khi bạn để trống `GEMINI_API_KEY` (hoặc khi chạy `npm test` trên CI/CD), hệ thống vẫn hoạt động **100% không lỗi** nhờ bộ **Grounded Deterministic Synthesizer & Lexical BM25 Fallback** đọc trực tiếp từ các Chunks đã cắt để trả lời và trích dẫn `[Chunk-ID]` chuẩn xác!

---

## 3. Ma Trận Phân Quyền 2 Lớp (AGENTS.md Mục 14)

| Endpoint                          |           `SYSTEM_ADMIN`            |       `BUSINESS_OPS_MANAGER`        |               `FACILITY_MANAGER`               | `FACILITY_STAFF` |   `CUSTOMER`   |
| :-------------------------------- | :---------------------------------: | :---------------------------------: | :--------------------------------------------: | :--------------: | :------------: |
| `POST /statistics/ai-rag-advisor` |  ✅ Toàn chuỗi / Lọc `facilityId`   |  ✅ Toàn chuỗi / Lọc `facilityId`   | ✅ Khóa cứng vào `assignedFacilityId` của mình |  ❌ 403 (`103`)  | ❌ 403 (`103`) |
| `GET /statistics/ai-rag-eval`     | ✅ Chạy kiểm định RAG toàn hệ thống | ✅ Chạy kiểm định RAG toàn hệ thống |                 ❌ 403 (`103`)                 |  ❌ 403 (`103`)  | ❌ 403 (`103`) |

> **Quy tắc kiểm tra phạm vi cơ sở cho `FACILITY_MANAGER`:**
>
> - Chưa được gán cơ sở (`!caller.assignedFacilityId` và không phải `Facility.managerId`) $\rightarrow$ từ chối `403 MESSAGE_CODE_103`.
> - Truyền `body.facilityId` khác với cơ sở mình quản lý HOẶC hỏi đích danh mã chi nhánh (`Facility.code`) của cơ sở khác $\rightarrow$ từ chối `403 MESSAGE_CODE_122`.

---

## 4. Quyết Định Nghiệp Vụ (`[OPEN D-RAG.x]`)

|      ID       | Vấn đề / Quyết định                                  | Giá trị mặc định áp dụng                                                                                                                                                                                                                      | Đặt ở đâu                                                         |
| :-----------: | :--------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| **`D-RAG.1`** | Bộ 3 Model Gemini Free Tier cho Embedding & Router   | Embedding: `gemini-embedding-001`; Câu hỏi dễ (`SIMPLE`): `gemini-3.5-flash-lite`; Câu hỏi khó (`COMPLEX`): `gemini-3.8-flash`                                                                                                                | `src/config/statistics.config.ts`                                 |
| **`D-RAG.2`** | Chiến lược cắt tài liệu (Chunking) & Số lượng `topK` | Cắt theo miền báo cáo (`CHUNK-OVERVIEW`, `CHUNK-TRENDS`, `CHUNK-KPI-{code}`, `CHUNK-FINANCE`, `CHUNK-PRODUCT-OPS`) + 4 chunks Playbook quy tắc nghiệp vụ; lấy **Top-K = 5 chunks** trước mỗi câu trả lời                                      | `src/config/statistics.config.ts` & `statisticsRagEngine.util.ts` |
| **`D-RAG.3`** | Cơ chế Hybrid Retrieval & Grounded Fallback          | Kết hợp Cosine Similarity (`gemini-embedding-001`) + điểm từ khóa BM25. Tự động chuyển sang `GROUNDED_DETERMINISTIC_FALLBACK` nếu thiếu `GEMINI_API_KEY` hoặc gọi API quá `15000ms`                                                           | `statisticsRagEngine.util.ts`                                     |
| **`D-RAG.4`** | Lưu Cache cho câu hỏi lặp lại                        | Lưu trên Redis (`TTL = 1800s`) theo khóa chuẩn hóa `statistics:rag:v1:{scope}:{fromDate}:{toDate}:{focusArea}:{sha256(normalizedQuestion)}`; có cờ `refresh: true` để ép phân tích mới                                                        | `statistics.service.ts`                                           |
| **`D-RAG.5`** | Xử lý Prompt Injection, Out-of-Scope & Thiếu dữ liệu | - Prompt Injection $\rightarrow$ ném `400 MESSAGE_CODE_821`<br>- Câu hỏi ngoài lề $\rightarrow$ trả về `groundingStatus: 'OUT_OF_SCOPE_REJECTED'`<br>- Hỏi dữ liệu ngoài hệ thống $\rightarrow$ trả về `groundingStatus: 'INSUFFICIENT_DATA'` | `statisticsRagEngine.util.ts`                                     |

---

## 5. Danh Sách Tasks Triển Khai

|  Task ID   | Tên Task                                                                   | Mô tả & Trách nhiệm                                                                                                                                                                                                                                                                                                                                                            |     Phụ thuộc     |
| :--------: | :------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------: |
| **`T0.1`** | **Config, Enums, Message Code & Zod Schemas cho RAG Advisor**              | Mở rộng `statistics.enum.ts`, `statistics.config.ts`, thêm `MESSAGE_CODE_821`, định nghĩa `ragAdvisorRequestSchema`, `ragAdvisorResponseSchema` và `ragEvalResponseSchema`                                                                                                                                                                                                     | `statistics/T1.5` |
| **`T1.1`** | **Xây dựng Core RAG Engine (`statisticsRagEngine.util.ts`)**               | Triển khai: (1) `inspectQuerySafetyAndScope` chống Prompt Injection & lọc Out-of-Scope; (2) `routeQueryComplexity` (`SIMPLE` vs `COMPLEX`); (3) `buildKnowledgeChunks` cắt 5 báo cáo + Playbook không lộ PII; (4) `retrieveTopKChunks` (Hybrid Vector `gemini-embedding-001` + BM25); (5) `generateGroundedRagResponse` với System Prompt, XML Sandboxing & Citation Validator |      `T0.1`       |
| **`T1.2`** | **Tích hợp `StatisticsService`, Redis Cache, RBAC 2 Lớp & Controller**     | Thêm `askRagAdvisor` (tích hợp Redis cache + Pre-retrieval RBAC scoping) và `evaluateRagAdvisor` vào `StatisticsService`; mở 2 endpoints `POST /statistics/ai-rag-advisor` và `GET /statistics/ai-rag-eval` trong `StatisticsController`; wire `redis` vào `statistics.container.ts`                                                                                           |      `T1.1`       |
| **`T1.3`** | **Bộ Kiểm định Chất lượng RAG (Automated Eval Suite & Integration Tests)** | Xây dựng Golden Dataset trong `runRagEvaluationSuite` và viết bộ test toàn diện `tests/statisticsRagAdvisor.test.ts` kiểm chứng đủ 8 tiêu chuẩn RAG (System Prompt, Chunking/Retrieval, RBAC 2 lớp, Prompt Injection, Redis Cache, Model Router, Strict Grounding, và Eval API), cập nhật `FE_PROMPT_STATISTICS.md`                                                            |      `T1.2`       |
