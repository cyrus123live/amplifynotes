// markdown.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Pipe({
  name: 'markdown',
  standalone: true          // 👈 add this
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  normaliseMarkdown(src: string): string {
    return src
      // start every HR on its own line
      .replace(/(^|\n)\s*---(?!\n)/g, '\n---\n')
      // ensure a space + newline before headings that are stuck to text
      .replace(/(^|\n)(#+)(\S)/g, '$1$2 $3')
      // collapse accidental triple-hyphen+heading combos
      .replace(/---\s*\n#+/g, match => `\n${match.trim()}`);
  }

  transform(value: string | null): SafeHtml {
    if (!value) return '';
    const html = marked.parse(this.normaliseMarkdown(value), { breaks: true }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}