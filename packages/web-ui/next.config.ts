import type { NextConfig } from "next";

const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Only apply to client-side build
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ["javascript", "typescript", "html", "css"], // Specify desired languages
        })
      );
    }
    return config;
  },
};

export default nextConfig;
