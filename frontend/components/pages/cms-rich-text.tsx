import sanitizeHtml from 'sanitize-html';

interface CmsRichTextProps {
  content: string;
}

const allowedTags = [
  'h2',
  'h3',
  'h4',
  'p',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'a',
  'br',
  'blockquote',
];

export function sanitizeCmsContent(content: string): string {
  return sanitizeHtml(content, {
    allowedTags,
    allowedAttributes: { a: ['href', 'rel', 'target'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => {
        const external = /^https?:\/\//i.test(attributes.href ?? '');
        return {
          tagName: 'a',
          attribs: {
            ...attributes,
            rel: 'noopener noreferrer',
            ...(external ? { target: '_blank' } : {}),
          },
        };
      },
    },
  });
}

export function CmsRichText({ content }: CmsRichTextProps) {
  const sanitizedContent = sanitizeCmsContent(content);

  return (
    <div
      className="space-y-4 text-sm leading-7 text-foreground/80 sm:text-base sm:leading-8 [&_a]:font-semibold [&_a]:text-secondary [&_a]:underline [&_blockquote]:border-s-2 [&_blockquote]:border-accent [&_blockquote]:ps-5 [&_h2]:type-h4 [&_h2]:text-primary [&_h3]:pt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-primary [&_h4]:font-semibold [&_h4]:text-primary [&_li]:ms-5 [&_li]:ps-1 [&_ol]:list-decimal [&_ul]:list-disc"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}
