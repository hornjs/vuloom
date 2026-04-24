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
    "base": [
      "group relative block my-5 p-4 sm:p-6 border border-default rounded-md bg-default",
      "transition-colors"
    ],
    "icon": "size-6 mb-2 block",
    "title": "text-highlighted font-semibold",
    "description": "text-[15px] text-muted *:first:mt-0 *:last:mb-0 *:my-1",
    "externalIcon": [
      "size-4 align-top absolute right-2 top-2 text-dimmed pointer-events-none",
      "transition-colors"
    ]
  },
  "variants": {
    "color": {
      "primary": {
        "icon": "text-primary"
      },
      "secondary": {
        "icon": "text-secondary"
      },
      "info": {
        "icon": "text-info"
      },
      "success": {
        "icon": "text-success"
      },
      "warning": {
        "icon": "text-warning"
      },
      "error": {
        "icon": "text-error"
      },
      "important": {
        "icon": "text-important"
      },
      "neutral": {
        "icon": "text-highlighted"
      }
    },
    "to": {
      "true": ""
    },
    "title": {
      "true": {
        "description": "mt-1"
      }
    }
  },
  "compoundVariants": [
    {
      "color": "primary" as typeof color[number],
      "to": true,
      "class": {
        "base": "hover:bg-primary/10 hover:border-primary has-focus-visible:border-primary",
        "externalIcon": "group-hover:text-primary"
      }
    },
    {
      "color": "secondary" as typeof color[number],
      "to": true,
      "class": {
        "base": "hover:bg-secondary/10 hover:border-secondary has-focus-visible:border-secondary",
        "externalIcon": "group-hover:text-secondary"
      }
    },
    {
      "color": "info" as typeof color[number],
      "to": true,
      "class": {
        "base": "hover:bg-info/10 hover:border-info has-focus-visible:border-info",
        "externalIcon": "group-hover:text-info"
      }
    },
    {
      "color": "success" as typeof color[number],
      "to": true,
      "class": {
        "base": "hover:bg-success/10 hover:border-success has-focus-visible:border-success",
        "externalIcon": "group-hover:text-success"
      }
    },
    {
      "color": "warning" as typeof color[number],
      "to": true,
      "class": {
        "base": "hover:bg-warning/10 hover:border-warning has-focus-visible:border-warning",
        "externalIcon": "group-hover:text-warning"
      }
    },
    {
      "color": "error" as typeof color[number],
      "to": true,
      "class": {
        "base": "hover:bg-error/10 hover:border-error has-focus-visible:border-error",
        "externalIcon": "group-hover:text-error"
      }
    },
    {
      "color": "important" as typeof color[number],
      "to": true,
      "class": {
        "base": "hover:bg-important/10 hover:border-important has-focus-visible:border-important",
        "externalIcon": "group-hover:text-important"
      }
    },
    {
      "color": "neutral" as typeof color[number],
      "to": true,
      "class": {
        "base": "hover:bg-elevated/50 hover:border-inverted has-focus-visible:border-inverted",
        "externalIcon": "group-hover:text-highlighted"
      }
    }
  ],
  "defaultVariants": {
    "color": "primary" as typeof color[number]
  }
}