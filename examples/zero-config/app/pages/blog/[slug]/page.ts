import { defineComponent, h } from "vue";
import { useLoaderData, useRoute } from "vuepagelet";

export default defineComponent({
  name: "BlogPostPage",
  setup() {
    const route = useRoute();
    const data = useLoaderData<{
      middlewareTrace: string;
      slug: string;
      summary: string;
    }>();

    return {
      route,
      data,
    };
  },
  render() {
    return h("section", null, [
      h("h1", null, this.data?.slug ?? "Unknown post"),
      h("p", null, this.data?.summary ?? ""),
      h("p", null, `Middleware trace: ${this.data?.middlewareTrace ?? "missing"}`),
      h("p", null, `Current route path: ${this.route?.fullPath ?? ""}`),
    ]);
  },
});
