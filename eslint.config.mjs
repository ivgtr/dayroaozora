import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["node_modules/", ".next/", "out/", "coverage/"],
  },
];

export default eslintConfig;
