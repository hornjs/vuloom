const color = [
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "error",
  "important",
  "neutral"
] as const

export default {
  "base": "px-1.5 py-0.5 text-sm font-mono font-medium rounded-md inline-block",
  "variants": {
    "color": {
      "primary": "border border-primary/25 bg-primary/10 text-primary",
      "secondary": "border border-secondary/25 bg-secondary/10 text-secondary",
      "info": "border border-info/25 bg-info/10 text-info",
      "success": "border border-success/25 bg-success/10 text-success",
      "warning": "border border-warning/25 bg-warning/10 text-warning",
      "error": "border border-error/25 bg-error/10 text-error",
      "important": "border border-important/25 bg-important/10 text-important",
      "neutral": "border border-muted text-highlighted bg-muted"
    }
  },
  "defaultVariants": {
    "color": "neutral" as typeof color[number]
  }
}