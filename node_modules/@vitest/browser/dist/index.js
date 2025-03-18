import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { builtinModules } from 'module';
import { polyfillPath } from 'modern-node-polyfills';
import sirv from 'sirv';
import MagicString from 'magic-string';
import { walk } from 'estree-walker';

/**
 * @param {import('estree').Node} param
 * @returns {string[]}
 */
function extract_names(param) {
	return extract_identifiers(param).map(node => node.name);
}

/**
 * @param {import('estree').Node} param
 * @param {import('estree').Identifier[]} nodes
 * @returns {import('estree').Identifier[]}
 */
function extract_identifiers(param, nodes = []) {
	switch (param.type) {
		case 'Identifier':
			nodes.push(param);
			break;

		case 'MemberExpression':
			let object = param;
			while (object.type === 'MemberExpression') {
				object = /** @type {any} */ (object.object);
			}
			nodes.push(/** @type {any} */ (object));
			break;

		case 'ObjectPattern':
			/** @param {import('estree').Property | import('estree').RestElement} prop */
			const handle_prop = (prop) => {
				if (prop.type === 'RestElement') {
					extract_identifiers(prop.argument, nodes);
				} else {
					extract_identifiers(prop.value, nodes);
				}
			};

			param.properties.forEach(handle_prop);
			break;

		case 'ArrayPattern':
			/** @param {import('estree').Node} element */
			const handle_element = (element) => {
				if (element) extract_identifiers(element, nodes);
			};

			param.elements.forEach((element) => {
				if (element) {
					handle_element(element);
				}
			});
			break;

		case 'RestElement':
			extract_identifiers(param.argument, nodes);
			break;

		case 'AssignmentPattern':
			extract_identifiers(param.left, nodes);
			break;
	}

	return nodes;
}

const isNodeInPatternWeakSet = /* @__PURE__ */ new WeakSet();
function setIsNodeInPattern(node) {
  return isNodeInPatternWeakSet.add(node);
}
function isNodeInPattern(node) {
  return isNodeInPatternWeakSet.has(node);
}
function esmWalker(root, { onIdentifier, onImportMeta, onDynamicImport }) {
  const parentStack = [];
  const varKindStack = [];
  const scopeMap = /* @__PURE__ */ new WeakMap();
  const identifiers = [];
  const setScope = (node, name) => {
    let scopeIds = scopeMap.get(node);
    if (scopeIds && scopeIds.has(name))
      return;
    if (!scopeIds) {
      scopeIds = /* @__PURE__ */ new Set();
      scopeMap.set(node, scopeIds);
    }
    scopeIds.add(name);
  };
  function isInScope(name, parents) {
    return parents.some((node) => {
      var _a;
      return node && ((_a = scopeMap.get(node)) == null ? void 0 : _a.has(name));
    });
  }
  function handlePattern(p, parentScope) {
    if (p.type === "Identifier") {
      setScope(parentScope, p.name);
    } else if (p.type === "RestElement") {
      handlePattern(p.argument, parentScope);
    } else if (p.type === "ObjectPattern") {
      p.properties.forEach((property) => {
        if (property.type === "RestElement")
          setScope(parentScope, property.argument.name);
        else
          handlePattern(property.value, parentScope);
      });
    } else if (p.type === "ArrayPattern") {
      p.elements.forEach((element) => {
        if (element)
          handlePattern(element, parentScope);
      });
    } else if (p.type === "AssignmentPattern") {
      handlePattern(p.left, parentScope);
    } else {
      setScope(parentScope, p.name);
    }
  }
  walk(root, {
    enter(node, parent) {
      if (node.type === "ImportDeclaration")
        return this.skip();
      if (parent && !(parent.type === "IfStatement" && node === parent.alternate))
        parentStack.unshift(parent);
      if (node.type === "VariableDeclaration")
        varKindStack.unshift(node.kind);
      if (node.type === "MetaProperty" && node.meta.name === "import")
        onImportMeta(node);
      else if (node.type === "ImportExpression")
        onDynamicImport(node);
      if (node.type === "Identifier") {
        if (!isInScope(node.name, parentStack) && isRefIdentifier(node, parent, parentStack)) {
          identifiers.push([node, parentStack.slice(0)]);
        }
      } else if (isFunctionNode(node)) {
        if (node.type === "FunctionDeclaration") {
          const parentScope = findParentScope(parentStack);
          if (parentScope)
            setScope(parentScope, node.id.name);
        }
        node.params.forEach((p) => {
          if (p.type === "ObjectPattern" || p.type === "ArrayPattern") {
            handlePattern(p, node);
            return;
          }
          walk(p.type === "AssignmentPattern" ? p.left : p, {
            enter(child, parent2) {
              if ((parent2 == null ? void 0 : parent2.type) === "AssignmentPattern" && (parent2 == null ? void 0 : parent2.right) === child)
                return this.skip();
              if (child.type !== "Identifier")
                return;
              if (isStaticPropertyKey(child, parent2))
                return;
              if ((parent2 == null ? void 0 : parent2.type) === "TemplateLiteral" && (parent2 == null ? void 0 : parent2.expressions.includes(child)) || (parent2 == null ? void 0 : parent2.type) === "CallExpression" && (parent2 == null ? void 0 : parent2.callee) === child)
                return;
              setScope(node, child.name);
            }
          });
        });
      } else if (node.type === "Property" && parent.type === "ObjectPattern") {
        setIsNodeInPattern(node);
      } else if (node.type === "VariableDeclarator") {
        const parentFunction = findParentScope(
          parentStack,
          varKindStack[0] === "var"
        );
        if (parentFunction)
          handlePattern(node.id, parentFunction);
      } else if (node.type === "CatchClause" && node.param) {
        handlePattern(node.param, node);
      }
    },
    leave(node, parent) {
      if (parent && !(parent.type === "IfStatement" && node === parent.alternate))
        parentStack.shift();
      if (node.type === "VariableDeclaration")
        varKindStack.shift();
    }
  });
  identifiers.forEach(([node, stack]) => {
    if (!isInScope(node.name, stack))
      onIdentifier(node, stack[0], stack);
  });
}
function isRefIdentifier(id, parent, parentStack) {
  if (parent.type === "CatchClause" || (parent.type === "VariableDeclarator" || parent.type === "ClassDeclaration") && parent.id === id)
    return false;
  if (isFunctionNode(parent)) {
    if (parent.id === id)
      return false;
    if (parent.params.includes(id))
      return false;
  }
  if (parent.type === "MethodDefinition" && !parent.computed)
    return false;
  if (isStaticPropertyKey(id, parent))
    return false;
  if (isNodeInPattern(parent) && parent.value === id)
    return false;
  if (parent.type === "ArrayPattern" && !isInDestructuringAssignment(parent, parentStack))
    return false;
  if (parent.type === "MemberExpression" && parent.property === id && !parent.computed)
    return false;
  if (parent.type === "ExportSpecifier")
    return false;
  if (id.name === "arguments")
    return false;
  return true;
}
function isStaticProperty(node) {
  return node && node.type === "Property" && !node.computed;
}
function isStaticPropertyKey(node, parent) {
  return isStaticProperty(parent) && parent.key === node;
}
const functionNodeTypeRE = /Function(?:Expression|Declaration)$|Method$/;
function isFunctionNode(node) {
  return functionNodeTypeRE.test(node.type);
}
const blockNodeTypeRE = /^BlockStatement$|^For(?:In|Of)?Statement$/;
function isBlock(node) {
  return blockNodeTypeRE.test(node.type);
}
function findParentScope(parentStack, isVar = false) {
  return parentStack.find(isVar ? isFunctionNode : isBlock);
}
function isInDestructuringAssignment(parent, parentStack) {
  if (parent && (parent.type === "Property" || parent.type === "ArrayPattern"))
    return parentStack.some((i) => i.type === "AssignmentExpression");
  return false;
}

const viInjectedKey = "__vi_inject__";
const viExportAllHelper = "__vi_export_all__";
const skipHijack = [
  "/@vite/client",
  "/@vite/env",
  /vite\/dist\/client/
];
function injectVitestModule(code, id, parse) {
  if (skipHijack.some((skip) => id.match(skip)))
    return;
  const s = new MagicString(code);
  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      ecmaVersion: "latest",
      locations: true
    });
  } catch (err) {
    console.error(`Cannot parse ${id}:
${err.message}`);
    return;
  }
  let uid = 0;
  const idToImportMap = /* @__PURE__ */ new Map();
  const declaredConst = /* @__PURE__ */ new Set();
  const hoistIndex = 0;
  let hasInjected = false;
  const transformImportDeclaration = (node) => {
    const source = node.source.value;
    if (skipHijack.some((skip) => source.match(skip)))
      return null;
    const importId = `__vi_esm_${uid++}__`;
    const hasSpecifiers = node.specifiers.length > 0;
    const code2 = hasSpecifiers ? `import { ${viInjectedKey} as ${importId} } from '${source}'
` : `import '${source}'
`;
    return {
      code: code2,
      id: importId
    };
  };
  function defineImport(node) {
    const declaration = transformImportDeclaration(node);
    if (!declaration)
      return null;
    s.appendLeft(hoistIndex, declaration.code);
    return declaration.id;
  }
  function defineImportAll(source) {
    const importId = `__vi_esm_${uid++}__`;
    s.appendLeft(hoistIndex, `const { ${viInjectedKey}: ${importId} } = await import(${JSON.stringify(source)});
`);
    return importId;
  }
  function defineExport(position, name, local = name) {
    hasInjected = true;
    s.appendLeft(
      position,
      `
Object.defineProperty(${viInjectedKey}, "${name}", { enumerable: true, configurable: true, get(){ return ${local} }});`
    );
  }
  for (const node of ast.body) {
    if (node.type === "ImportDeclaration") {
      const importId = defineImport(node);
      if (!importId)
        continue;
      s.remove(node.start, node.end);
      for (const spec of node.specifiers) {
        if (spec.type === "ImportSpecifier") {
          idToImportMap.set(
            spec.local.name,
            `${importId}.${spec.imported.name}`
          );
        } else if (spec.type === "ImportDefaultSpecifier") {
          idToImportMap.set(spec.local.name, `${importId}.default`);
        } else {
          idToImportMap.set(spec.local.name, importId);
        }
      }
    }
  }
  for (const node of ast.body) {
    if (node.type === "ExportNamedDeclaration") {
      if (node.declaration) {
        if (node.declaration.type === "FunctionDeclaration" || node.declaration.type === "ClassDeclaration") {
          defineExport(node.end, node.declaration.id.name);
        } else {
          for (const declaration of node.declaration.declarations) {
            const names = extract_names(declaration.id);
            for (const name of names)
              defineExport(node.end, name);
          }
        }
        s.remove(node.start, node.declaration.start);
      } else {
        s.remove(node.start, node.end);
        if (node.source) {
          const importId = defineImportAll(node.source.value);
          for (const spec of node.specifiers) {
            defineExport(
              hoistIndex,
              spec.exported.name,
              `${importId}.${spec.local.name}`
            );
          }
        } else {
          for (const spec of node.specifiers) {
            const local = spec.local.name;
            const binding = idToImportMap.get(local);
            defineExport(node.end, spec.exported.name, binding || local);
          }
        }
      }
    }
    if (node.type === "ExportDefaultDeclaration") {
      const expressionTypes = ["FunctionExpression", "ClassExpression"];
      if ("id" in node.declaration && node.declaration.id && !expressionTypes.includes(node.declaration.type)) {
        hasInjected = true;
        const { name } = node.declaration.id;
        s.remove(
          node.start,
          node.start + 15
          /* 'export default '.length */
        );
        s.append(
          `
Object.defineProperty(${viInjectedKey}, "default", { enumerable: true, configurable: true, value: ${name} });`
        );
      } else {
        hasInjected = true;
        s.update(
          node.start,
          node.start + 14,
          `${viInjectedKey}.default =`
        );
        s.append(`
export default { ${viInjectedKey}: ${viInjectedKey}.default };
`);
      }
    }
    if (node.type === "ExportAllDeclaration") {
      s.remove(node.start, node.end);
      const importId = defineImportAll(node.source.value);
      if (node.exported) {
        defineExport(hoistIndex, node.exported.name, `${importId}`);
      } else {
        hasInjected = true;
        s.appendLeft(hoistIndex, `${viExportAllHelper}(${viInjectedKey}, ${importId});
`);
      }
    }
  }
  esmWalker(ast, {
    onIdentifier(id2, parent, parentStack) {
      const grandparent = parentStack[1];
      const binding = idToImportMap.get(id2.name);
      if (!binding)
        return;
      if (isStaticProperty(parent) && parent.shorthand) {
        if (!isNodeInPattern(parent) || isInDestructuringAssignment(parent, parentStack))
          s.appendLeft(id2.end, `: ${binding}`);
      } else if (parent.type === "PropertyDefinition" && (grandparent == null ? void 0 : grandparent.type) === "ClassBody" || parent.type === "ClassDeclaration" && id2 === parent.superClass) {
        if (!declaredConst.has(id2.name)) {
          declaredConst.add(id2.name);
          const topNode = parentStack[parentStack.length - 2];
          s.prependRight(topNode.start, `const ${id2.name} = ${binding};
`);
        }
      } else if (
        // don't transform class name identifier
        !(parent.type === "ClassExpression" && id2 === parent.id)
      ) {
        s.update(id2.start, id2.end, binding);
      }
    },
    // TODO: make env updatable
    onImportMeta() {
    },
    onDynamicImport(node) {
      const replace = "__vi_wrap_module__(import(";
      s.overwrite(node.start, node.source.start, replace);
      s.overwrite(node.end - 1, node.end, "))");
    }
  });
  if (hasInjected) {
    s.prepend(`const ${viInjectedKey} = { [Symbol.toStringTag]: "Module" };
`);
    s.append(`
export { ${viInjectedKey} }`);
  }
  return {
    ast,
    code: s.toString(),
    map: s.generateMap({ hires: true, source: id })
  };
}

const polyfills = [
  "util"
];
var index = (project, base = "/") => {
  const pkgRoot = resolve(fileURLToPath(import.meta.url), "../..");
  const distRoot = resolve(pkgRoot, "dist");
  return [
    {
      enforce: "pre",
      name: "vitest:browser",
      async config(viteConfig) {
        // Enables using ignore hint for coverage providers with @preserve keyword
        viteConfig.esbuild || (viteConfig.esbuild = {});
        viteConfig.esbuild.legalComments = "inline";
      },
      async configureServer(server) {
        server.middlewares.use(
          base,
          sirv(resolve(distRoot, "client"), {
            single: false,
            dev: true
          })
        );
      }
    },
    {
      name: "modern-node-polyfills",
      enforce: "pre",
      config() {
        return {
          optimizeDeps: {
            exclude: [
              ...polyfills,
              ...builtinModules,
              "vitest",
              "vitest/utils",
              "vitest/browser",
              "vitest/runners",
              "@vitest/utils"
            ],
            include: [
              "vitest > @vitest/utils > pretty-format",
              "vitest > diff-sequences",
              "vitest > loupe",
              "vitest > pretty-format",
              "vitest > pretty-format > ansi-styles",
              "vitest > pretty-format > ansi-regex",
              "vitest > chai"
            ]
          }
        };
      },
      async resolveId(id) {
        if (!builtinModules.includes(id) && !polyfills.includes(id) && !id.startsWith("node:")) {
          if (!/\?browserv=\w+$/.test(id))
            return;
          let useId = id.slice(0, id.lastIndexOf("?"));
          if (useId.startsWith("/@fs/"))
            useId = useId.slice(5);
          if (/^\w:/.test(useId))
            useId = useId.replace(/\\/g, "/");
          return useId;
        }
        id = normalizeId(id);
        return { id: await polyfillPath(id), moduleSideEffects: false };
      }
    },
    {
      name: "vitest:browser:esm-injector",
      enforce: "post",
      transform(source, id) {
        const hijackESM = project.config.browser.slowHijackESM ?? false;
        if (!hijackESM)
          return;
        return injectVitestModule(source, id, this.parse);
      }
    }
  ];
};
function normalizeId(id, base) {
  if (base && id.startsWith(base))
    id = `/${id.slice(base.length)}`;
  return id.replace(/^\/@id\/__x00__/, "\0").replace(/^\/@id\//, "").replace(/^__vite-browser-external:/, "").replace(/^node:/, "").replace(/[?&]v=\w+/, "?").replace(/\?$/, "");
}

export { index as default };
