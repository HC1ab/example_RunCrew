import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/", "coverage/", "metrics/", "dashboard/"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      // 객체에서 필드를 빼낼 때 쓰는 rest 패턴의 변수는 허용
      "no-unused-vars": ["error", { ignoreRestSiblings: true }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];
