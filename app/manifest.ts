import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Saree Pro",
    short_name: "Saree Pro",
    description: "A multi-role delivery platform for customers, merchants, drivers, and operations teams.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6efe6",
    theme_color: "#c85935",
    lang: "en",
    categories: ["food", "business", "shopping", "productivity"],
    icons: [
      {
        src: "/saree-pro-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/saree-pro-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
