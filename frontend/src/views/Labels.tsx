// Renders status labels as text (never color alone, contracts/ui.md §Accessibility).
export function Labels(props: { labels: readonly string[] }) {
  if (props.labels.length === 0) return null
  return (
    <span className="labels">
      {props.labels.map((l) => (
        <span key={l} className="tag" data-label>
          {l}
        </span>
      ))}
    </span>
  )
}
