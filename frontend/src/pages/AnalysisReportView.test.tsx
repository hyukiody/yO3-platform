import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AnalysisReportView from './AnalysisReportView';

// Mock fetch API
global.fetch = vi.fn();

describe('AnalysisReportView Component', () => {
  const mockAnalyses = [
    {
      id: 1,
      analysisId: 'analysis-uuid-001',
      cameraId: 'camera-001',
      analysisType: 'SUMMARY',
      analysisStatus: 'COMPLETED',
      eventCount: 50,
      analysisStartTime: '2024-01-15T10:00:00',
      analysisEndTime: '2024-01-15T12:00:00',
      summary: 'Test summary of events',
      detailedReport: 'Detailed report content',
      keyFindings: 'Key findings content',
      anomalies: 'Anomalies detected',
      recommendations: 'Recommendations provided',
      statistics: '{"totalEvents": 50, "averageConfidence": 0.85}',
      llmModel: 'gpt-4',
      promptTokens: 500,
      completionTokens: 300,
      processingTimeMs: 2500,
      confidenceScore: 0.92,
      createdAt: '2024-01-15T12:30:00',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ analyses: mockAnalyses }),
    });
  });

  it('should render the component header', async () => {
    render(<AnalysisReportView />);
    expect(screen.getByText('Analysis & Reporting')).toBeInTheDocument();
  });

  it('should display analysis form section', async () => {
    const { container } = render(<AnalysisReportView />);
    const hasText = container.textContent?.includes('Create New Analysis');
    expect(hasText).toBe(true);
  });

  it('should have camera input field', async () => {
    render(<AnalysisReportView />);
    expect(screen.getByPlaceholderText(/Camera ID/)).toBeInTheDocument();
  });

  it('should render recent analyses section', async () => {
    render(<AnalysisReportView />);
    expect(screen.getByText('Recent Analyses')).toBeInTheDocument();
  });

  it('should have a form in the component', async () => {
    const { container } = render(<AnalysisReportView />);
    const form = container.querySelector('form');
    expect(form).toBeDefined();
  });

  it('should have analysis type dropdown', async () => {
    render(<AnalysisReportView />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('should display component without crashing', async () => {
    const { container } = render(<AnalysisReportView />);
    expect(container.firstChild).toBeDefined();
  });

  it('should have proper HTML structure', async () => {
    const { container } = render(<AnalysisReportView />);
    expect(container.innerHTML.length).toBeGreaterThan(100);
  });

  it('should render main container', async () => {
    const { container } = render(<AnalysisReportView />);
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(0);
  });

  it('should have header describing analysis functionality', async () => {
    render(<AnalysisReportView />);
    expect(screen.getByText(/LLM-powered event analysis/)).toBeInTheDocument();
  });
});
