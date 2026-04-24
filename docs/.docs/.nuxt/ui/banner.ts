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
  "slots": {
    "root": [
      "relative z-50 w-full",
      "transition-colors"
    ],
    "container": "flex items-center justify-between gap-3 h-12",
    "left": "hidden lg:flex-1 lg:flex lg:items-center",
    "center": "flex items-center gap-1.5 min-w-0",
    "right": "lg:flex-1 flex items-center justify-end",
    "icon": "size-5 shrink-0 text-inverted pointer-events-none",
    "title": "text-sm text-inverted font-medium truncate",
    "actions": "flex gap-1.5 shrink-0 isolate",
    "close": "text-inverted hover:bg-default/10 focus-visible:bg-default/10 -me-1.5 lg:me-0"
  },
  "variants": {
    "color": {
      "primary": {
        "root": "bg-primary"
      },
      "secondary": {
        "root": "bg-secondary"
      },
      "info": {
        "root": "bg-info"
      },
      "success": {
        "root": "bg-success"
      },
      "warning": {
        "root": "bg-warning"
      },
      "error": {
        "root": "bg-error"
      },
      "important": {
        "root": "bg-important"
      },
      "neutral": {
        "root": "bg-inverted"
      }
    },
    "to": {
      "true": ""
    }
  },
  "compoundVariants": [
    {
      "color": "primary" as typeof color[number],
      "to": true,
      "class": {
        "root": "hover:bg-primary/90"
      }
    },
    {
      "color": "secondary" as typeof color[number],
      "to": true,
      "class": {
        "root": "hover:bg-secondary/90"
      }
    },
    {
      "color": "info" as typeof color[number],
      "to": true,
      "class": {
        "root": "hover:bg-info/90"
      }
    },
    {
      "color": "success" as typeof color[number],
      "to": true,
      "class": {
        "root": "hover:bg-success/90"
      }
    },
    {
      "color": "warning" as typeof color[number],
      "to": true,
      "class": {
        "root": "hover:bg-warning/90"
      }
    },
    {
      "color": "error" as typeof color[number],
      "to": true,
      "class": {
        "root": "hover:bg-error/90"
      }
    },
    {
      "color": "important" as typeof color[number],
      "to": true,
      "class": {
        "root": "hover:bg-important/90"
      }
    },
    {
      "color": "neutral" as typeof color[number],
      "to": true,
      "class": {
        "root": "hover:bg-inverted/90"
      }
    }
  ],
  "defaultVariants": {
    "color": "primary" as typeof color[number]
  }
}