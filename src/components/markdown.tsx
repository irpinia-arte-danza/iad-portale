import type { InlineNode, MarkdownBlock } from "@/lib/content/markdown"

// Rende l'albero di parseMarkdown. Niente dangerouslySetInnerHTML: il testo
// passa da React, che fa l'escape. Le classi sono pensate per leggere un
// testo lungo dal telefono: interlinea larga, titoli che si distinguono senza
// essere enormi.
export function Markdown({ blocks }: { blocks: MarkdownBlock[] }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-foreground">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  )
}

function Block({ block }: { block: MarkdownBlock }) {
  switch (block.type) {
    case "heading":
      if (block.level === 1) {
        return (
          <h1 className="text-2xl font-semibold tracking-tight">
            <Inline nodes={block.children} />
          </h1>
        )
      }
      if (block.level === 2) {
        return (
          <h2 className="pt-4 text-lg font-semibold">
            <Inline nodes={block.children} />
          </h2>
        )
      }
      return (
        <h3 className="pt-2 text-base font-semibold">
          <Inline nodes={block.children} />
        </h3>
      )
    case "paragraph":
      return (
        <p>
          <Inline nodes={block.children} />
        </p>
      )
    case "list": {
      const Tag = block.ordered ? "ol" : "ul"
      return (
        <Tag
          className={
            block.ordered
              ? "list-decimal space-y-2 pl-5"
              : "list-disc space-y-2 pl-5"
          }
        >
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline nodes={item} />
            </li>
          ))}
        </Tag>
      )
    }
    case "rule":
      return <hr className="border-border" />
  }
}

function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.type === "text") return node.value
        if (node.type === "strong") {
          return (
            <strong key={index} className="font-semibold">
              <Inline nodes={node.children} />
            </strong>
          )
        }
        const external = !node.href.startsWith("/")
        return (
          <a
            key={index}
            href={node.href}
            className="underline underline-offset-4 hover:text-primary"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <Inline nodes={node.children} />
          </a>
        )
      })}
    </>
  )
}
