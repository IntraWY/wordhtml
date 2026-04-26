import { CLEANERS, type CleanerKey } from "@/types";

interface Example {
  before: string;
  after: string;
}

const EXAMPLES: Record<CleanerKey, Example> = {
  removeInlineStyles: {
    before: `<p style="color:#ff0000;font-weight:bold">Hello</p>`,
    after: `<p>Hello</p>`,
  },
  removeEmptyTags: {
    before: `<div><p></p><p>Hi</p><span></span></div>`,
    after: `<div><p>Hi</p></div>`,
  },
  collapseSpaces: {
    before: `<p>hello    world  !</p>`,
    after: `<p>hello world !</p>`,
  },
  removeAttributes: {
    before: `<a href="https://x.com" class="cta" data-track="link">click</a>`,
    after: `<a href="https://x.com">click</a>`,
  },
  removeClassesAndIds: {
    before: `<p class="lead" id="intro">Hi</p>`,
    after: `<p>Hi</p>`,
  },
  removeComments: {
    before: `<p>Hi</p><!-- editor metadata -->`,
    after: `<p>Hi</p>`,
  },
  unwrapSpans: {
    before: `<p><span style="color:red"><strong>bold</strong></span> text</p>`,
    after: `<p><strong>bold</strong> text</p>`,
  },
  plainText: {
    before: `<h1>Title</h1><p><strong>Body</strong> here.</p>`,
    after: `Title\n\nBody here.`,
  },
};

export function CleanerExplainers() {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">
        ตัวทำความสะอาด 8 แบบ
      </h2>
      <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
        แต่ละแบบเป็นการแปลงแบบเดียวที่คาดเดาได้ ทำงานเมื่อส่งออก
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {CLEANERS.map(({ key, label, description }) => {
          const example = EXAMPLES[key];
          return (
            <article
              key={key}
              className="flex flex-col gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-5"
            >
              <header>
                <h3 className="text-sm font-semibold tracking-tight">
                  {label}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[color:var(--color-muted-foreground)]">
                  {description}
                </p>
              </header>
              <div className="grid gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)] p-3 font-mono text-[11px] leading-relaxed">
                <Snippet label="ก่อน" content={example.before} />
                <Snippet label="หลัง" content={example.after} accent />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

interface SnippetProps {
  label: string;
  content: string;
  accent?: boolean;
}

function Snippet({ label, content, accent }: SnippetProps) {
  return (
    <div className="flex gap-3">
      <span
        className={
          accent
            ? "shrink-0 rounded-sm bg-[color:var(--color-foreground)] px-1.5 text-[9px] font-semibold uppercase tracking-wider text-[color:var(--color-accent-foreground)]"
            : "shrink-0 rounded-sm border border-[color:var(--color-border-strong)] px-1.5 text-[9px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]"
        }
      >
        {label}
      </span>
      <code className="break-all text-[color:var(--color-foreground)]">
        {content}
      </code>
    </div>
  );
}
