/** @type {import('typescript').Config} */
export default {
  compilerOptions: {
    jsx: "react", // or "preserve", "react-jsx", etc.
    jsxFactory: "React.createElement", // or your custom factory
    jsxImportSource: "react", // for React 17+ or other libraries
  },
};
