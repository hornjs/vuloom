import type { BannerProps } from "@nuxt/ui";

export interface SiteConfig {
  dir?: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  url?: string;
  logo?: string;
  lang?: string;
  github?: string;
  socials?: Record<string, string>;
  llms?: {
    full?: {
      title?: string;
      description?: string;
    };
  };
  branch?: string;
  banner?: BannerProps;
  versions?: { label: string; to: string; active?: boolean }[];
  themeColor?: string;
  redirects?: Record<string, string>;
  automd?: unknown;
  buildCache?: boolean;
  sponsors?: { api: string };
  landing: {
    title?: string;
    description?: string;
    _heroMdTitle?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    heroDescription?: string;
    heroLinks?: Record<
      string,
      string | { label?: string; icon?: string; to?: string; size?: string; order?: number }
    >;
    heroCode?: {
      content: string;
      title: string;
      lang: string;
      contentHighlighted?: string;
    };
    featuresTitle?: string;
    featuresLayout?: "default" | "hero";
    features: { title: string; description?: string; icon?: string }[];
    contributors?: boolean;
  };
}

const siteConfig: SiteConfig = {
  name: "Vuloom",
  shortDescription: "The Full-Stack Vue Framework",
  description: "Build full-stack Vue applications with typed file routing, server rendering, route loaders and actions, and first-class server handlers.",
  github: "hornjs/vuloom",
  logo: "/icon.svg",
  url: inferSiteURL(),
  socials: {},
  banner: {
    icon: "i-lucide-info",
    title: "in-processing",
  },
  versions: [],
  automd: true,
  lang: "en",
  landing: {
    contributors: true,
    heroLinks: {
      primary: {
        label: "Get Started",
        icon: "i-heroicons-rocket-launch",
        to: "/getting-started",
      },
      playOnline: {
        label: "Play Online",
        icon: "i-heroicons-play",
        to: "https://stackblitz.com/fork/github/hornjs/vuloom/tree/main/examples/zero-config?startScript=dev&title=Vuloom%20StackBlitz%20Example",
      }
    },
    // heroCode: {
    //   lang: "ts",
    //   title: "server.ts",
    //   content: ''
    // },
    features: [
      {
        title: "Typed File Routing",
        description: "Generate route ids, route params, middleware names, and navigation targets directly from your app structure with `horn prepare`.",
        icon: "clarity:success-standard-line",
      },
      {
        title: "Full-Stack by Default",
        description: "Ship page routes, route loaders and actions, app shell data, and raw `server/routes` HTTP handlers from one project structure.",
        icon: "devicon-plain:fastapi",
      },
      {
        title: "Vue-Native DX",
        description: "Use Vue SFC, JSX/TSX, or render functions with document-level SSR, navigation loading boundaries, and composables built for Vue 3.",
        icon: "hugeicons:happy",
      }
    ]
  }
}

export const generateConfig = async () => {
  // Convert markdown to HTML for landing items
  const md4w = await import("md4w");
  await md4w.init();
  for (const item of siteConfig.landing.features) {
    if (item.description) {
      item.description = md4w.mdToHtml(item.description);
    }
  }

  // // Normalize and format hero code
  // const shiki = await import("shiki");
  // siteConfig.landing.heroCode.contentHighlighted = (
  //   await shiki.codeToHtml(siteConfig.landing.heroCode.content, {
  //     lang: siteConfig.landing.heroCode.lang || "sh",
  //     defaultColor: "dark",
  //     themes: {
  //       default: "vitesse-dark",
  //       dark: "vitesse-dark",
  //       light: "vitesse-light",
  //     },
  //   })
  // )
  //   .replace(/background-color:#[0-9a-fA-F]{6};/g, "")
  //   .replaceAll(`<span class="line"></span>`, "");

  (await import("node:fs")).writeFileSync("./config.json", JSON.stringify(siteConfig, null, 2))
}

function inferSiteURL() {
  return (
    process.env.NUXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL && `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`) || // Vercel
    process.env.URL || // Netlify
    process.env.CI_PAGES_URL || // Gitlab Pages
    process.env.CF_PAGES_URL // Cloudflare Pages
  );
}
