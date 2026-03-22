import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { GraphResult, OnboardingResult } from './api'

const SEVERITY_COLOR: Record<string, [number, number, number]> = {
  BLOCKER:  [220, 38,  38],
  CRITICAL: [234, 88,  12],
  MAJOR:    [202, 138,  4],
  MINOR:    [59,  130, 246],
  INFO:     [100, 116, 139],
}

type DocWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } }

function sectionHeader(doc: jsPDF, text: string, y: number, W: number): number {
  doc.setFillColor(20, 10, 40)
  doc.rect(14, y - 3, W - 28, 10, 'F')
  doc.setTextColor(167, 139, 250)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(text, 18, y + 4)
  return y + 12
}

function addPageIfNeeded(doc: jsPDF, y: number, needed = 30): number {
  if (y > 280 - needed) { doc.addPage(); return 20 }
  return y
}

export function downloadPdf(
  repoUrl: string,
  graph: GraphResult,
  onboarding: OnboardingResult | null,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  let y = 0

  // ── 표지 헤더 ─────────────────────────────────────────────────────────────
  doc.setFillColor(5, 5, 16)
  doc.rect(0, 0, W, 35, 'F')
  // 퍼플 그라디언트 효과 (사각형 레이어)
  doc.setFillColor(124, 58, 237)
  doc.rect(0, 0, 4, 35, 'F')
  doc.setFillColor(52, 211, 153)
  doc.rect(4, 0, 2, 35, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('OnboardAI', 14, 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(167, 139, 250)
  doc.text('AI-Powered Codebase Onboarding Guide', 14, 21)
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(8)
  doc.text(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), W - 14, 21, { align: 'right' })

  y = 43
  doc.setTextColor(52, 211, 153)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Repository', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 200, 220)
  doc.text(repoUrl, 40, y)

  y += 12

  // ── 온보딩 가이드 메인 섹션 ────────────────────────────────────────────────
  if (onboarding) {

    // 1. 프로젝트 개요
    if (onboarding.project_overview) {
      y = sectionHeader(doc, '1. PROJECT OVERVIEW', y, W)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(200, 200, 220)
      const summaryLines = doc.splitTextToSize(onboarding.project_overview.summary, W - 28) as string[]
      doc.text(summaryLines, 14, y)
      y += summaryLines.length * 4 + 4

      if (onboarding.project_overview.tech_stack.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Technology', 'Purpose']],
          body: onboarding.project_overview.tech_stack.map(t => [t.name, t.purpose]),
          styles: { fontSize: 7.5, cellPadding: 2.5 },
          headStyles: { fillColor: [40, 20, 80], textColor: [167, 139, 250], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [12, 10, 30] },
          bodyStyles: { fillColor: [8, 8, 20], textColor: [200, 200, 220] },
          margin: { left: 14, right: 14 },
        })
        y = (doc as DocWithAutoTable).lastAutoTable.finalY + 8
      }
    } else {
      // 아키텍처 요약만 있는 경우
      y = sectionHeader(doc, '1. ARCHITECTURE SUMMARY', y, W)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(200, 200, 220)
      const lines = doc.splitTextToSize(onboarding.architecture_summary, W - 28) as string[]
      doc.text(lines, 14, y)
      y += lines.length * 4 + 8
    }

    // 2. 아키텍처 요약 (project_overview가 있는 경우 별도 섹션)
    if (onboarding.project_overview) {
      y = addPageIfNeeded(doc, y)
      y = sectionHeader(doc, '2. ARCHITECTURE SUMMARY', y, W)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(200, 200, 220)
      const lines = doc.splitTextToSize(onboarding.architecture_summary, W - 28) as string[]
      doc.text(lines, 14, y)
      y += lines.length * 4 + 8
    }

    const sectionOffset = onboarding.project_overview ? 2 : 1

    // Getting Started
    if (onboarding.getting_started) {
      y = addPageIfNeeded(doc, y)
      y = sectionHeader(doc, `${sectionOffset + 1}. GETTING STARTED`, y, W)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(200, 200, 220)
      const overviewLines = doc.splitTextToSize(onboarding.getting_started.overview, W - 28) as string[]
      doc.text(overviewLines, 14, y)
      y += overviewLines.length * 4 + 4

      for (const step of onboarding.getting_started.steps) {
        y = addPageIfNeeded(doc, y, 20)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(52, 211, 153)
        doc.setFontSize(8)
        doc.text(`Step ${step.step}: ${step.title}`, 14, y)
        y += 4
        if (step.command) {
          doc.setFillColor(0, 0, 0)
          const cmdWidth = W - 28
          doc.roundedRect(14, y - 1, cmdWidth, 7, 1, 1, 'F')
          doc.setFont('courier', 'normal')
          doc.setTextColor(52, 211, 153)
          doc.setFontSize(7.5)
          doc.text(step.command.slice(0, 80), 17, y + 4)
          y += 10
        }
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(160, 160, 190)
        const descLines = doc.splitTextToSize(step.description, W - 28) as string[]
        doc.text(descLines, 14, y)
        y += descLines.length * 4 + 3
      }
      y += 4
    }

    // 핵심 모듈
    const modules = onboarding.core_modules ?? onboarding.top_classes ?? []
    if (modules.length > 0) {
      y = addPageIfNeeded(doc, y)
      y = sectionHeader(doc, `${sectionOffset + 2}. CORE MODULES`, y, W)
      autoTable(doc, {
        startY: y,
        head: [['Module', 'Layer', 'Role', 'Why Important']],
        body: modules.map(m => [
          m.name,
          m.layer,
          m.role,
          m.why_important,
        ]),
        styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [40, 20, 80], textColor: [167, 139, 250], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [12, 10, 30] },
        bodyStyles: { fillColor: [8, 8, 20], textColor: [200, 200, 220] },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'bold', textColor: [255, 255, 255] },
          1: { cellWidth: 22 },
          2: { cellWidth: 65 },
          3: { cellWidth: 58 },
        },
        margin: { left: 14, right: 14 },
      })
      y = (doc as DocWithAutoTable).lastAutoTable.finalY + 8
    }

    // Feature Walkthrough
    if (onboarding.feature_walkthrough) {
      y = addPageIfNeeded(doc, y)
      y = sectionHeader(doc, `${sectionOffset + 3}. FEATURE WALKTHROUGH: ${onboarding.feature_walkthrough.feature_name.toUpperCase()}`, y, W)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(200, 200, 220)
      const descLines = doc.splitTextToSize(onboarding.feature_walkthrough.description, W - 28) as string[]
      doc.text(descLines, 14, y)
      y += descLines.length * 4 + 4
      for (const step of onboarding.feature_walkthrough.steps) {
        y = addPageIfNeeded(doc, y, 12)
        const stepLines = doc.splitTextToSize(step, W - 28) as string[]
        doc.setTextColor(52, 211, 153)
        doc.text('▸', 14, y)
        doc.setTextColor(200, 200, 220)
        doc.text(stepLines, 20, y)
        y += stepLines.length * 4 + 1
      }
      y += 6
    }

    // 핵심 용어 사전
    if (onboarding.key_concepts.length > 0) {
      y = addPageIfNeeded(doc, y)
      y = sectionHeader(doc, `${sectionOffset + 4}. KEY CONCEPTS`, y, W)
      autoTable(doc, {
        startY: y,
        head: [['Term', 'Definition']],
        body: onboarding.key_concepts.map(c => [c.term, c.definition]),
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        headStyles: { fillColor: [40, 20, 80], textColor: [167, 139, 250], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [12, 10, 30] },
        bodyStyles: { fillColor: [8, 8, 20], textColor: [200, 200, 220] },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: 'bold', textColor: [167, 139, 250] },
          1: { cellWidth: 135 },
        },
        margin: { left: 14, right: 14 },
      })
      y = (doc as DocWithAutoTable).lastAutoTable.finalY + 8
    }

    // 온보딩 체크리스트
    const checklist = onboarding.onboarding_checklist ?? (onboarding.onboarding_tip ? onboarding.onboarding_tip.split('\n').filter(Boolean) : [])
    if (checklist.length > 0) {
      y = addPageIfNeeded(doc, y)
      y = sectionHeader(doc, `${sectionOffset + 5}. ONBOARDING CHECKLIST`, y, W)
      for (const item of checklist) {
        y = addPageIfNeeded(doc, y, 10)
        doc.setFontSize(8)
        doc.setTextColor(52, 211, 153)
        doc.text('☐', 14, y)
        doc.setTextColor(200, 200, 220)
        doc.setFont('helvetica', 'normal')
        const itemLines = doc.splitTextToSize(item, W - 32) as string[]
        doc.text(itemLines, 22, y)
        y += itemLines.length * 4 + 1
      }
      y += 6
    }

    // 첫 기여 제안
    if (onboarding.first_contribution) {
      y = addPageIfNeeded(doc, y)
      y = sectionHeader(doc, `${sectionOffset + 6}. FIRST CONTRIBUTION SUGGESTION`, y, W)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(167, 139, 250)
      doc.text(onboarding.first_contribution.title, 14, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(200, 200, 220)
      const contribLines = doc.splitTextToSize(onboarding.first_contribution.description, W - 28) as string[]
      doc.text(contribLines, 14, y)
      y += contribLines.length * 4 + 4
      if (onboarding.first_contribution.relevant_files.length > 0) {
        doc.setTextColor(100, 100, 140)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.text('Related files:', 14, y)
        y += 4
        for (const f of onboarding.first_contribution.relevant_files) {
          doc.setFont('courier', 'normal')
          doc.setTextColor(52, 211, 153)
          doc.text(`  ${f}`, 14, y)
          y += 4
        }
      }
      y += 6
    }
  }

  // ── 이슈 요약 (분석 결과가 있는 경우) ──────────────────────────────────────
  const issues = graph.issues ?? []
  if (issues.length > 0) {
    y = addPageIfNeeded(doc, y)
    y = sectionHeader(doc, 'CODE ISSUES', y, W)

    const countBySev: Record<string, number> = {}
    issues.forEach(i => { countBySev[i.severity] = (countBySev[i.severity] ?? 0) + 1 })

    const sevOrder = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO']
    let x = 14
    sevOrder.forEach(sev => {
      const count = countBySev[sev] ?? 0
      if (count === 0) return
      const [r, g, b] = SEVERITY_COLOR[sev]
      doc.setFillColor(r, g, b)
      doc.roundedRect(x, y, 28, 12, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(String(count), x + 14, y + 7, { align: 'center' })
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'normal')
      doc.text(sev, x + 14, y + 11, { align: 'center' })
      x += 31
    })
    y += 18

    autoTable(doc, {
      startY: y,
      head: [['Severity', 'Rule', 'Message', 'Location', 'CWE']],
      body: issues.slice(0, 50).map(issue => [
        issue.severity, issue.rule_id, issue.message,
        `${issue.file}:${issue.line}`, issue.cwe ?? '',
      ]),
      styles: { fontSize: 6.5, cellPadding: 2 },
      headStyles: { fillColor: [40, 20, 80], textColor: [167, 139, 250], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [12, 10, 30] },
      bodyStyles: { fillColor: [8, 8, 20], textColor: [200, 200, 220] },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 25 },
        2: { cellWidth: 75 },
        3: { cellWidth: 42 },
        4: { cellWidth: 18 },
      },
      didParseCell: (data) => {
        if (data.column.index === 0 && data.section === 'body') {
          const sev = data.cell.raw as string
          const [r, g, b] = SEVERITY_COLOR[sev] ?? [100, 116, 139]
          data.cell.styles.textColor = [r, g, b]
          data.cell.styles.fontStyle = 'bold'
        }
      },
      margin: { left: 14, right: 14 },
    })
    y = (doc as DocWithAutoTable).lastAutoTable.finalY + 8
  }

  // ── 푸터 ──────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(5, 5, 16)
    doc.rect(0, 285, W, 12, 'F')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 100, 140)
    doc.text('Generated by OnboardAI · onboardai.makelab.kr', 14, 291)
    doc.text(`Page ${i} / ${pageCount}`, W - 14, 291, { align: 'right' })
  }

  const repoName = repoUrl.split('/').pop() ?? 'report'
  doc.save(`onboardai-${repoName}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
