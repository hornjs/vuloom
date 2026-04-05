import { defineComponent, h } from "vue";
import type { PageRouteRecord } from "phial/app";

type RouteLoadingProps = {
  route: PageRouteRecord;
};

export default defineComponent({
  name: "ExampleBlogLoading",
  props: {
    route: {
      type: Object,
      required: true,
    },
  },
  setup(props: Pick<RouteLoadingProps, "route">) {
    return {
      props,
    };
  },
  render() {
    return h(
      "article",
      {
        style:
          "display: grid; gap: 12px; margin-top: 12px; padding: 18px; border-radius: 14px; background: #f5f5f2; border: 1px solid #dad8d1;",
      },
      [
        h(
          "h1",
          {
            style: "margin: 0;",
          },
          "Loading blog article...",
        ),
        h(
          "p",
          {
            style: "margin: 0; color: #6c6c66;",
          },
          `Preparing ${this.props.route.path ?? "blog article"}`,
        ),
      ],
    );
  },
});
