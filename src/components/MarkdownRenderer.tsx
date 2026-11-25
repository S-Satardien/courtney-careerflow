'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses inline markdown tokens (**bold**, *italic*, [links](url)) into React nodes.
 */
function renderInlineTokens(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-bold text-white tracking-tight">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`i-${match.index}`} className="italic text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const linkText = token.substring(1, token.indexOf(']('));
      const linkUrl = token.substring(token.indexOf('](') + 2, token.length - 1);
      parts.push(
        <a
          key={`a-${match.index}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors font-medium"
        >
          {linkText}
        </a>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

/**
 * Lightweight accessible Markdown renderer for tailored cover letters and CV summaries.
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const lines = content.split('\n');

  return (
    <div className={`space-y-2.5 leading-relaxed text-slate-300 ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        if (trimmed.startsWith('## ')) {
          return (
            <h3
              key={idx}
              className="text-sm font-bold uppercase tracking-wider text-emerald-400 pt-2 border-b border-white/10 pb-1"
            >
              {trimmed.substring(3)}
            </h3>
          );
        }

        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="text-base font-extrabold text-white tracking-wide">
              {trimmed.substring(2)}
            </h2>
          );
        }

        if (/^[•\-*]\s+/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[•\-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start space-x-2 pl-2">
              <span className="text-rose-400 font-bold select-none mt-0.5">•</span>
              <p className="text-xs text-slate-200 flex-1">{renderInlineTokens(bulletText)}</p>
            </div>
          );
        }

        return (
          <p key={idx} className="text-xs text-slate-200">
            {renderInlineTokens(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
