import type { ComputedRef, MaybeRef } from 'vue'

type ComponentProps<T> = T extends new(...args: any) => { $props: infer P } ? NonNullable<P>
  : T extends (props: infer P, ...args: any) => any ? P
  : {}

declare module 'nuxt/app' {
  interface NuxtLayouts {
    blog: ComponentProps<typeof import("/Users/bourdon/dev/hornjs-develop-stack/repos/vuloom/node_modules/.pnpm/undocs@0.4.16_@babel+core@7.29.0_@babel+plugin-syntax-jsx@7.28.6_@babel+core@7.29.0__@e_2d315543fc63d82b1fb0ec495115132c/node_modules/undocs/app/layouts/blog.vue").default>
    docs: ComponentProps<typeof import("/Users/bourdon/dev/hornjs-develop-stack/repos/vuloom/node_modules/.pnpm/undocs@0.4.16_@babel+core@7.29.0_@babel+plugin-syntax-jsx@7.28.6_@babel+core@7.29.0__@e_2d315543fc63d82b1fb0ec495115132c/node_modules/undocs/app/layouts/docs.vue").default>
  }
  export type LayoutKey = keyof NuxtLayouts extends never ? string : keyof NuxtLayouts
  interface PageMeta {
    layout?: MaybeRef<LayoutKey | false> | ComputedRef<LayoutKey | false> | {
      [K in LayoutKey]: {
        name?: MaybeRef<K | false> | ComputedRef<K | false>
        props?: NuxtLayouts[K]
      }
    }[LayoutKey]
  }
}