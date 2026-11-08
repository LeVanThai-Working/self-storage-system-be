# Tiến Độ Task — Phân Hệ AI RAG Phân Tích Báo Cáo & Tư Vấn Tối Ưu Lợi Nhuận (`rag-advisor`)

> File này được cập nhật bởi `/remember` và được commit lên Git.  
> Theo dõi trạng thái thực tế của các tasks thuộc phân hệ `rag-advisor` (tích hợp trong `src/modules/statistics/`).

---

## Bảng Theo Dõi Tiến Độ Task

|    ID    | Tên Task                                                                   | Trạng thái |     Phụ thuộc     | PR / Commit | Cập nhật & Ghi chú                                                                                                                                                                                                                                                                                                                                                                                                                                |
| :------: | :------------------------------------------------------------------------- | :--------: | :---------------: | :---------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **T0.1** | **Config, Enums, Message Code & Zod Schemas cho RAG Advisor**              |  ✅ DONE   | `statistics/T1.5` |      —      | `2026-11-08`: Đã hoàn thành 6 enums (`statistics.enum.ts`), `StatisticsRagAdvisorConfig` (`statistics.config.ts`), `MESSAGE_CODE_821` (`messageCode.const.ts`), `ragAdvisorRequestSchema`, `ragAdvisorResponseSchema`, `ragEvalResponseSchema` và pass 5/5 tests (`tests/statisticsRagP0Schemas.test.ts`)                                                                                                                                         |
| **T1.1** | **Xây dựng Core RAG Engine (`statisticsRagEngine.util.ts`)**               |  ✅ DONE   |      `T0.1`       |      —      | `2026-11-08`: Đã hoàn thành `statisticsRagEngine.util.ts` (Guardrails chống Prompt Injection `400 821`, Facility Scope Guard `403 122`, Out-of-Scope & Insufficient Data, Complexity Router `SIMPLE` vs `COMPLEX`, Opportunity VND Calculator, Semantic Chunker, Hybrid Retriever `gemini-embedding-001` `:batchEmbedContents` + BM25, Strict Grounded Generator & Citation Verifier) và pass 8/8 tests (`tests/statisticsRagEngineT1_1.test.ts`) |
| **T1.2** | **Tích hợp `StatisticsService`, Redis Cache, RBAC 2 Lớp & Controller**     |  ✅ DONE   |      `T1.1`       |      —      | `2026-11-08`: Đã hoàn thành `StatisticsService.askRagAdvisor` (Redis cache TTL 30p + RBAC 2 lớp + chặn hỏi chéo mã cơ sở `403 122`), `StatisticsService.evaluateRagAdvisor`, `runRagEvaluationSuite` (Golden Dataset 10 kịch bản), `POST /statistics/ai-rag-advisor` và `GET /statistics/ai-rag-eval` trong `StatisticsController`, wire `redis` vào `statistics.container.ts` và pass 6/6 tests (`tests/statisticsRagServiceT1_2.test.ts`)       |
| **T1.3** | **Bộ Kiểm định Chất lượng RAG (Automated Eval Suite & Integration Tests)** |  ✅ DONE   |      `T1.2`       |      —      | `2026-11-08`: Đã hoàn thành bộ test tổng hợp 8 trụ cột RAG `tests/statisticsRagAdvisor.test.ts` (3/3 pass, tổng 22/22 tests RAG pass 100%, kiểm chứng Zero-PII, RBAC 2 lớp, Citation Verifier, Redis Cache, Eval Suite 100%) và cập nhật đầy đủ `docs/agent/statistics/FE_PROMPT_STATISTICS.md`                                                                                                                                                   |

---

## Danh Sách Quyết Định Nghiệp Vụ (`[OPEN Dx]`)

|     ID      | Quyết định                                           | Giá trị mặc định đang áp dụng                                                                                                                                               | Trạng thái | Ghi chú                                                        |
| :---------: | :--------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------: | :------------------------------------------------------------- |
| **D-RAG.1** | Bộ 3 Model Gemini Free Tier                          | Embedding: `gemini-embedding-001`; Câu hỏi dễ (`SIMPLE`): `gemini-3.5-flash-lite`; Câu hỏi khó (`COMPLEX`): `gemini-3.8-flash`                                              |  ĐỀ XUẤT   | Đặt tại `statistics.config.ts`                                 |
| **D-RAG.2** | Chiến lược cắt tài liệu (Chunking) & `topK`          | Cắt theo miền báo cáo (`CHUNK-OVERVIEW`, `CHUNK-TRENDS`, `CHUNK-KPI-{code}`, `CHUNK-FINANCE`, `CHUNK-PRODUCT-OPS`) + 4 chunks Playbook; mặc định `topK = 5`                 |  ĐỀ XUẤT   | Đặt tại `statistics.config.ts` & `statisticsRagEngine.util.ts` |
| **D-RAG.3** | Hybrid Retrieval & Grounded Fallback                 | Kết hợp Cosine Similarity (`gemini-embedding-001`) + điểm từ khóa BM25; tự động dùng `GROUNDED_DETERMINISTIC_FALLBACK` nếu thiếu `GEMINI_API_KEY` hoặc timeout `15000ms`    |  ĐỀ XUẤT   | Đặt tại `statisticsRagEngine.util.ts`                          |
| **D-RAG.4** | Cache câu hỏi lặp lại trên Redis                     | Lưu Redis (`TTL = 1800s`) theo khóa băm SHA-256 câu hỏi đã chuẩn hóa kèm `scopedFacilityId`, `fromDate`, `toDate`, `focusArea`; hỗ trợ `refresh: true`                      |  ĐỀ XUẤT   | Đặt tại `statistics.service.ts`                                |
| **D-RAG.5** | Xử lý Prompt Injection, Out-of-Scope & Thiếu dữ liệu | Prompt Injection $\rightarrow$ `400 MESSAGE_CODE_821`; Câu hỏi ngoài lề $\rightarrow$ `OUT_OF_SCOPE_REJECTED`; Hỏi dữ liệu ngoài hệ thống $\rightarrow$ `INSUFFICIENT_DATA` |  ĐỀ XUẤT   | Đặt tại `statisticsRagEngine.util.ts`                          |

---

## Giả Định Đã Dùng

| Task      | Giả định                                                                                                                                                                      | Đặt ở đâu (config / flag)     |
| :-------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------- |
| T0.1–T1.3 | Mọi số tiền ước tính cơ hội (`opportunitySummary`, `estimatedImpactVnd`) đều là số nguyên VND (`Math.round()`), tính bằng hàm thuần TypeScript trước khi đưa vào chunk cho AI | `statisticsRagEngine.util.ts` |
| T0.1–T1.3 | Các chunks đưa vào RAG chỉ chứa chỉ số kinh doanh tổng hợp và quy tắc vận hành, tuyệt đối không chứa PII của khách hàng                                                       | `statisticsRagEngine.util.ts` |

---

## Phát Hiện Thêm Ngoài Phạm Vi (Out of Scope Findings)

- Chưa có phát hiện mới.
