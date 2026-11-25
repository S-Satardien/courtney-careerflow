'use client';

import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Packer,
} from 'docx';
import { courtneyProfile } from '@/data/courtney-profile';
import { JobListing } from '@/types/job';
import { generateTailoredDocuments } from '@/services/ai/tailor';

const COLOR_CHARCOAL = '2D3748';
const COLOR_ROSE = '9F5F69';
const COLOR_BODY = '1E293B';
const COLOR_MUTED = '64748B';

function createFormattedRuns(
  text: string,
  options: { font?: string; size?: number; color?: string; boldColor?: string } = {}
): TextRun[] {
  const font = options.font || 'Calibri';
  const size = options.size || 20;
  const color = options.color || COLOR_BODY;
  const boldColor = options.boldColor || COLOR_CHARCOAL;

  const runs: TextRun[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.substring(lastIndex, match.index), font, size, color }));
    }
    runs.push(new TextRun({ text: match[1], bold: true, font, size, color: boldColor }));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.substring(lastIndex), font, size, color }));
  }

  return runs;
}

function createSectionHeader(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 220, after: 100 },
    border: {
      bottom: { color: COLOR_ROSE, space: 4, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        font: 'Calibri',
        size: 22,
        color: COLOR_CHARCOAL,
      }),
    ],
  });
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Generates and downloads Courtney James's tailored Word CV (.docx) 100% client-side.
 * Works natively on static GitHub Pages with zero backend server required.
 *
 * @param job - Target Southern Suburbs job listing
 * @param summaryOverride - Optional live-edited summary text
 */
export async function downloadTailoredCvDocx(
  job: JobListing,
  summaryOverride?: string
): Promise<void> {
  const docs = job.tailoredDocuments || generateTailoredDocuments(job);
  const summaryText =
    summaryOverride || docs.tailoredCvSummary || courtneyProfile.trackSummaries[job.category];
  const highlights = docs.highlightedBullets || [];

  const prioritizedExperiences = [...courtneyProfile.experiences].sort((a, b) => {
    const aMatch = a.track === job.category ? 0 : 1;
    const bMatch = b.track === job.category ? 0 : 1;
    return aMatch - bMatch;
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 864, bottom: 864, left: 864, right: 864 } },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: courtneyProfile.name.toUpperCase(),
                bold: true,
                font: 'Calibri',
                size: 38,
                color: COLOR_CHARCOAL,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: `${job.title} Candidate | UCT PGCE & BA (English & Linguistics)`,
                bold: true,
                font: 'Calibri',
                size: 21,
                color: COLOR_ROSE,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            border: { bottom: { color: COLOR_MUTED, space: 4, style: BorderStyle.SINGLE, size: 4 } },
            children: [
              new TextRun({
                text: `${courtneyProfile.location} • ${courtneyProfile.phone} • ${courtneyProfile.email} • Valid SACE & Clear Police Clearance`,
                font: 'Calibri',
                size: 18,
                color: COLOR_MUTED,
              }),
            ],
          }),
          createSectionHeader('Professional Profile'),
          new Paragraph({
            spacing: { after: 140 },
            children: createFormattedRuns(summaryText, { size: 20 }),
          }),
          ...(highlights.length > 0
            ? [
                createSectionHeader(`Key Alignment for ${job.company}`),
                ...highlights.map(
                  (bullet) =>
                    new Paragraph({
                      bullet: { level: 0 },
                      spacing: { after: 70 },
                      children: createFormattedRuns(bullet, { size: 19 }),
                    })
                ),
              ]
            : []),
          createSectionHeader('Education & Credentials'),
          ...courtneyProfile.education.map(
            (edu) =>
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: `${edu.degree} — ${edu.institution} (${edu.year})\n`,
                    bold: true,
                    font: 'Calibri',
                    size: 20,
                    color: COLOR_CHARCOAL,
                  }),
                  new TextRun({ text: edu.focus, font: 'Calibri', size: 19, color: COLOR_MUTED }),
                ],
              })
          ),
          createSectionHeader('Professional Experience'),
          ...prioritizedExperiences.flatMap((exp) => [
            new Paragraph({
              spacing: { before: 120, after: 35 },
              children: [
                new TextRun({ text: exp.role, bold: true, font: 'Calibri', size: 21, color: COLOR_CHARCOAL }),
                new TextRun({
                  text: ` — ${exp.organization} (${exp.period})`,
                  italics: true,
                  font: 'Calibri',
                  size: 20,
                  color: COLOR_ROSE,
                }),
              ],
            }),
            ...exp.highlights.map(
              (h) =>
                new Paragraph({
                  bullet: { level: 0 },
                  spacing: { after: 50 },
                  children: createFormattedRuns(h, { size: 19 }),
                })
            ),
          ]),
          createSectionHeader('Community Engagement & NPO Leadership'),
          ...courtneyProfile.communityEngagement.flatMap((ce) => [
            new Paragraph({
              spacing: { before: 100, after: 30 },
              children: [
                new TextRun({ text: ce.role, bold: true, font: 'Calibri', size: 20, color: COLOR_CHARCOAL }),
                new TextRun({
                  text: ` — ${ce.organization} (${ce.period})`,
                  italics: true,
                  font: 'Calibri',
                  size: 19,
                  color: COLOR_ROSE,
                }),
              ],
            }),
            ...ce.highlights.map(
              (h) =>
                new Paragraph({
                  bullet: { level: 0 },
                  spacing: { after: 45 },
                  children: createFormattedRuns(h, { size: 19 }),
                })
            ),
          ]),
          createSectionHeader('Continuous Development & Certifications'),
          ...courtneyProfile.continuousDevelopment.map(
            (cd) =>
              new Paragraph({
                bullet: { level: 0 },
                spacing: { after: 45 },
                children: [
                  new TextRun({ text: `${cd.title} `, bold: true, font: 'Calibri', size: 19, color: COLOR_CHARCOAL }),
                  new TextRun({ text: `— ${cd.provider} (${cd.year})`, font: 'Calibri', size: 19, color: COLOR_MUTED }),
                ],
              })
          ),
          createSectionHeader('References'),
          ...courtneyProfile.references.map(
            (ref) =>
              new Paragraph({
                spacing: { after: 55 },
                children: [
                  new TextRun({ text: `${ref.name} `, bold: true, font: 'Calibri', size: 19, color: COLOR_CHARCOAL }),
                  new TextRun({
                    text: `(${ref.role}, ${ref.organization}) • ${ref.phone} • ${ref.email}`,
                    font: 'Calibri',
                    size: 19,
                    color: COLOR_BODY,
                  }),
                ],
              })
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeCompany = job.company.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40);
  triggerBlobDownload(blob, `Courtney_James_CV_${safeCompany}.docx`);
}

/**
 * Generates and downloads Courtney James's tailored Cover Letter (.docx) 100% client-side.
 *
 * @param job - Target job listing
 * @param letterOverride - Optional live-edited markdown cover letter text
 */
export async function downloadCoverLetterDocx(
  job: JobListing,
  letterOverride?: string
): Promise<void> {
  const docs = job.tailoredDocuments || generateTailoredDocuments(job);
  const letterMarkdown = letterOverride || docs.coverLetter;
  const lines = letterMarkdown.split('\n');
  const bodyParagraphs: Paragraph[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed === '**COURTNEY JAMES**') continue;

    if (/^[•\-*]\s+/.test(trimmed)) {
      const cleanBullet = trimmed.replace(/^[•\-*]\s+/, '');
      bodyParagraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80 },
          children: createFormattedRuns(cleanBullet, { size: 21 }),
        })
      );
    } else {
      bodyParagraphs.push(
        new Paragraph({
          spacing: { after: 130 },
          children: createFormattedRuns(trimmed, { size: 21 }),
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1008, bottom: 1008, left: 1008, right: 1008 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'COURTNEY JAMES',
                bold: true,
                font: 'Calibri',
                size: 38,
                color: COLOR_CHARCOAL,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 200 },
            border: { bottom: { color: COLOR_ROSE, space: 6, style: BorderStyle.SINGLE, size: 8 } },
            children: [
              new TextRun({
                text: `${courtneyProfile.location} • ${courtneyProfile.phone} • ${courtneyProfile.email}`,
                font: 'Calibri',
                size: 18,
                color: COLOR_MUTED,
              }),
            ],
          }),
          ...bodyParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeCompany = job.company.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40);
  triggerBlobDownload(blob, `Courtney_James_Cover_Letter_${safeCompany}.docx`);
}
