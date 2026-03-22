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

export function downloadPdf(
  repoUrl: string,
  graph: GraphResult,
  onboarding: OnboardingResult | null,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  let y = 0

  // ── 헤더 ──────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('OnboardAI', 14, 13)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Code Analysis Report', 14, 20)
  doc.setFontSize(8)
  doc.text(new Date().toLocaleDateString('ko-KR'), W - 14, 20, { align: 'right' })

  // ── 저장소 URL ─────────────────────────────────────────────────────────────
  y = 36
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Repository:', 14, y)
  doc.setFont('helvetica', 'bold')
  doc.text(repoUrl, 38, y)

  // ── 이슈 요약 카드 ─────────────────────────────────────────────────────────
  y += 10
  const issues = graph.issues ?? []
  const countBySev: Record<string, number> = {}
  issues.forEach(i => { countBySev[i.severity] = (countBySev[i.severity] ?? 0) + 1 })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text('Issues Summary', 14, y)
  y += 6

  const sevOrder = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO']
  let x = 14
  sevOrder.forEach(sev => {
    const count = countBySev[sev] ?? 0
    if (count === 0) return
    const [r, g, b] = SEVERITY_COLOR[sev]
    doc.setFillColor(r, g, b)
    doc.roundedRect(x, y, 30, 14, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(String(count), x + 15, y + 8, { align: 'center' })
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(sev, x + 15, y + 12, { align: 'center' })
    x += 34
  })

  // ── 이슈 테이블 ────────────────────────────────────────────────────────────
  y += 22
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Code Issues', 14, y)
  y += 4

  if (issues.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text('No issues found.', 14, y + 6)
    y += 12
  } else {
    const rows = issues.slice(0, 50).map(issue => [
      issue.severity,
      issue.rule_id,
      issue.message,
      `${issue.file}:${issue.line}`,
      issue.cwe ?? '',
    ])

    autoTable(doc, {
      startY: y,
      head: [['Severity', 'Rule', 'Message', 'Location', 'CWE']],
      body: rows,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
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
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // ── 온보딩 가이드 ──────────────────────────────────────────────────────────
  if (onboarding) {
    if (y > 230) { doc.addPage(); y = 20 }

    doc.setFillColor(16, 185, 129)
    doc.rect(0, y - 2, W, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('AI Onboarding Guide', 14, y + 5)
    y += 16

    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Architecture Summary', 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const lines = doc.splitTextToSize(onboarding.architecture_summary, W - 28) as string[]
    doc.text(lines, 14, y)
    y += lines.length * 4 + 6

    if (onboarding.top_classes.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('Key Classes', 14, y)
      y += 5
      autoTable(doc, {
        startY: y,
        head: [['Class', 'Layer', 'Role']],
        body: onboarding.top_classes.map(c => [c.name, c.layer, c.role]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      })
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    }
  }

  // ── 푸터 ──────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(`Made by OnboardAI · Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' })
  }

  const repoName = repoUrl.split('/').pop() ?? 'report'
  doc.save(`onboardai-${repoName}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
