import { describe, it, expect, afterEach } from 'vitest';
import { getStatisticsConfig } from '../src/config/statistics.config.ts';
import {
  RagQueryComplexityEnum,
  RagGroundingStatusEnum,
  AiInsightCategoryEnum,
  AiInsightPriorityEnum,
  AiInsightFocusAreaEnum,
  AiAdvisorProviderEnum,
} from '../src/common/enums/statistics.enum.ts';
import {
  MESSAGE_CODE,
  MESSAGE_DICTIONARY,
} from '../src/common/consts/messageCode.const.ts';
import { ragAdvisorRequestSchema } from '../src/modules/statistics/schemas/statistics.request.schema.ts';
import {
  ragAdvisorResponseSchema,
  ragEvalResponseSchema,
} from '../src/modules/statistics/schemas/statistics.response.schema.ts';

describe('RAG Advisor Milestone P0 — Config, Enums, Message Code & Schemas (rag-advisor/T0.1)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('1. Defines all required RAG enums and MESSAGE_CODE_821 for Prompt Injection', () => {
    expect(RagQueryComplexityEnum.SIMPLE).toBe('simple');
    expect(RagQueryComplexityEnum.COMPLEX).toBe('complex');

    expect(RagGroundingStatusEnum.GROUNDED).toBe('grounded');
    expect(RagGroundingStatusEnum.INSUFFICIENT_DATA).toBe('insufficient_data');
    expect(RagGroundingStatusEnum.OUT_OF_SCOPE_REJECTED).toBe(
      'out_of_scope_rejected'
    );

    expect(AiInsightCategoryEnum.PRICING_AND_PROMOTION).toBe(
      'pricing_and_promotion'
    );
    expect(AiInsightCategoryEnum.OCCUPANCY_AND_CAPACITY).toBe(
      'occupancy_and_capacity'
    );
    expect(AiInsightCategoryEnum.UPSELL_AND_PRODUCT_MIX).toBe(
      'upsell_and_product_mix'
    );
    expect(AiInsightCategoryEnum.CASHFLOW_AND_DEBT).toBe('cashflow_and_debt');
    expect(AiInsightCategoryEnum.OPERATIONS_AND_SLA).toBe('operations_and_sla');

    expect(AiInsightPriorityEnum.HIGH).toBe('high');
    expect(AiInsightPriorityEnum.MEDIUM).toBe('medium');
    expect(AiInsightPriorityEnum.LOW).toBe('low');

    expect(AiInsightFocusAreaEnum.ALL).toBe('all');
    expect(AiAdvisorProviderEnum.GEMINI).toBe('gemini');
    expect(AiAdvisorProviderEnum.GROUNDED_DETERMINISTIC_FALLBACK).toBe(
      'grounded_deterministic_fallback'
    );

    expect(MESSAGE_CODE.MESSAGE_CODE_821).toBe('MESSAGE_CODE_821');
    expect(MESSAGE_DICTIONARY.MESSAGE_CODE_821).toContain('Prompt Injection');
  });

  it('2. Loads default ragAdvisor config and safely handles valid/invalid env overrides', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.STATISTICS_RAG_EMBEDDING_MODEL;
    delete process.env.STATISTICS_RAG_FAST_MODEL;
    delete process.env.STATISTICS_RAG_REASONING_MODEL;
    delete process.env.STATISTICS_RAG_TOP_K;
    delete process.env.STATISTICS_RAG_CACHE_TTL_SECONDS;
    delete process.env.STATISTICS_RAG_TIMEOUT_MS;

    const defaultCfg = getStatisticsConfig().ragAdvisor;
    expect(defaultCfg.geminiApiKey).toBe('');
    expect(defaultCfg.embeddingModel).toBe('gemini-embedding-001');
    expect(defaultCfg.fastModel).toBe('gemini-3.5-flash-lite');
    expect(defaultCfg.reasoningModel).toBe('gemini-3.8-flash');
    expect(defaultCfg.topKChunks).toBe(5);
    expect(defaultCfg.cacheTtlSeconds).toBe(1800);
    expect(defaultCfg.requestTimeoutMs).toBe(15000);

    // Valid overrides
    process.env.GEMINI_API_KEY = '  test-key-123  ';
    process.env.STATISTICS_RAG_TOP_K = '6';
    process.env.STATISTICS_RAG_CACHE_TTL_SECONDS = '900';
    process.env.STATISTICS_RAG_TIMEOUT_MS = '12000';

    const customCfg = getStatisticsConfig().ragAdvisor;
    expect(customCfg.geminiApiKey).toBe('test-key-123');
    expect(customCfg.topKChunks).toBe(6);
    expect(customCfg.cacheTtlSeconds).toBe(900);
    expect(customCfg.requestTimeoutMs).toBe(12000);

    // Invalid overrides fallback safely
    process.env.STATISTICS_RAG_TOP_K = '99'; // exceeds max 8
    process.env.STATISTICS_RAG_CACHE_TTL_SECONDS = '-10';
    process.env.STATISTICS_RAG_TIMEOUT_MS = '200'; // < 1000ms
    const fallbackCfg = getStatisticsConfig().ragAdvisor;
    expect(fallbackCfg.topKChunks).toBe(5);
    expect(fallbackCfg.cacheTtlSeconds).toBe(1800);
    expect(fallbackCfg.requestTimeoutMs).toBe(15000);
  });

  it('3. Validates ragAdvisorRequestSchema for positive and negative inputs', () => {
    const valid = ragAdvisorRequestSchema.parse({
      question:
        '  Phân tích nguyên nhân doanh thu giảm và đề xuất giải pháp tăng lợi nhuận  ',
      fromDate: '2026-10-01',
      toDate: '2026-10-31',
      facilityId: '671000000000000000000001',
    });

    expect(valid.question).toBe(
      'Phân tích nguyên nhân doanh thu giảm và đề xuất giải pháp tăng lợi nhuận'
    );
    expect(valid.focusArea).toBe(AiInsightFocusAreaEnum.ALL);
    expect(valid.topK).toBe(5);
    expect(valid.refresh).toBe(false);

    // Negative: question too short (< 3 chars)
    expect(() =>
      ragAdvisorRequestSchema.parse({
        question: 'ab',
      })
    ).toThrow();

    // Negative: topK out of range (1..8)
    expect(() =>
      ragAdvisorRequestSchema.parse({
        question: 'Tỷ lệ lấp đầy kho tháng này là bao nhiêu?',
        topK: 15,
      })
    ).toThrow();

    // Negative: invalid facilityId format
    expect(() =>
      ragAdvisorRequestSchema.parse({
        question: 'Tỷ lệ lấp đầy kho tháng này là bao nhiêu?',
        facilityId: 'invalid-id',
      })
    ).toThrow();
  });

  it('4. Validates ragAdvisorResponseSchema and enforces integer VND money rules (Rule 21)', () => {
    const validPayload = {
      period: {
        fromDate: '2026-10-01T00:00:00.000Z',
        toDate: '2026-10-31T23:59:59.999Z',
        scopedFacilityId: null,
        focusArea: AiInsightFocusAreaEnum.ALL,
      },
      queryInfo: {
        question: 'Làm sao để tối ưu lợi nhuận kỳ này?',
        normalizedQuestion: 'lam sao de toi uu loi nhuan ky nay',
        groundingStatus: RagGroundingStatusEnum.GROUNDED,
        router: {
          complexity: RagQueryComplexityEnum.COMPLEX,
          selectedModel: 'gemini-3.8-flash',
          provider: AiAdvisorProviderEnum.GEMINI,
          reason: 'Multi-dimensional profit strategy question',
        },
        cached: false,
        generatedAt: '2026-11-08T05:00:00.000Z',
      },
      answer:
        'Dựa trên dữ liệu kỳ này [CHUNK-OVERVIEW], tổng cơ hội thu hồi doanh thu là 25.000.000 VND.',
      opportunityMetrics: {
        recoverableOverdueVnd: 10000000,
        maintenanceRevenueLossVnd: 5000000,
        idleCapacityOpportunityVnd: 10000000,
        totalOpportunityVnd: 25000000,
      },
      recommendations: [
        {
          id: 'REC-DEBT-01',
          category: AiInsightCategoryEnum.CASHFLOW_AND_DEBT,
          priority: AiInsightPriorityEnum.HIGH,
          title: 'Thu hồi nợ quá hạn trên 8 ngày',
          dataEvidence: 'Có 10.000.000 VND nợ quá hạn [CHUNK-FINANCE]',
          actionSteps: [
            'Gửi thông báo nhắc nợ khẩn cấp',
            'Rà soát chấm dứt hợp đồng vi phạm nếu quá hạn >= 5 ngày',
          ],
          expectedProfitImpact: 'Thu hồi dòng tiền mặt trực tiếp',
          estimatedImpactVnd: 10000000,
          targetFacilityCodes: ['HN01'],
        },
      ],
      citations: [
        {
          chunkId: 'CHUNK-OVERVIEW',
          category: 'overview',
          title: 'Tổng quan điều hành chuỗi',
          excerpt: 'Công nợ quá hạn: 10,000,000 VND',
          relevanceScore: 0.92,
        },
      ],
      retrievedChunkIds: ['CHUNK-OVERVIEW', 'CHUNK-FINANCE'],
    };

    const parsed = ragAdvisorResponseSchema.parse(validPayload);
    expect(parsed.opportunityMetrics.totalOpportunityVnd).toBe(25000000);

    // Negative: float VND amount violates Rule 21
    expect(() =>
      ragAdvisorResponseSchema.parse({
        ...validPayload,
        opportunityMetrics: {
          ...validPayload.opportunityMetrics,
          totalOpportunityVnd: 25000000.55,
        },
      })
    ).toThrow();
  });

  it('5. Validates ragEvalResponseSchema structure', () => {
    const validEval = {
      summary: {
        totalCases: 12,
        passedCases: 12,
        retrievalHitRatePercent: 100,
        citationFaithfulnessPercent: 100,
        routerAccuracyPercent: 100,
        guardrailDefenseRatePercent: 100,
        overallPassRatePercent: 100,
        evaluatedAt: '2026-11-08T05:00:00.000Z',
      },
      cases: [
        {
          caseId: 'EVAL-SIMPLE-01',
          category: 'simple_lookup',
          question: 'Tỷ lệ lấp đầy phòng kho hiện tại là bao nhiêu?',
          expectedComplexity: RagQueryComplexityEnum.SIMPLE,
          actualComplexity: RagQueryComplexityEnum.SIMPLE,
          expectedGroundingStatus: RagGroundingStatusEnum.GROUNDED,
          actualGroundingStatus: RagGroundingStatusEnum.GROUNDED,
          expectedChunkIds: ['CHUNK-OVERVIEW'],
          retrievedChunkIds: ['CHUNK-OVERVIEW', 'CHUNK-TRENDS'],
          retrievalHit: true,
          citationFaithful: true,
          routerMatched: true,
          guardrailPassed: true,
          passed: true,
        },
      ],
    };

    const parsed = ragEvalResponseSchema.parse(validEval);
    expect(parsed.summary.overallPassRatePercent).toBe(100);
    expect(parsed.cases).toHaveLength(1);
  });
});
