var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity)
      fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy)
      fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous")
      fetchOpts.credentials = "omit";
    else
      fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const scriptRel = "modulepreload";
const assetsURL = function(dep) {
  return "/" + dep;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  if (!deps || deps.length === 0) {
    return baseModule();
  }
  const links = document.getElementsByTagName("link");
  return Promise.all(deps.map((dep) => {
    dep = assetsURL(dep);
    if (dep in seen)
      return;
    seen[dep] = true;
    const isCss = dep.endsWith(".css");
    const cssSelector = isCss ? '[rel="stylesheet"]' : "";
    const isBaseRelative = !!importerUrl;
    if (isBaseRelative) {
      for (let i = links.length - 1; i >= 0; i--) {
        const link2 = links[i];
        if (link2.href === dep && (!isCss || link2.rel === "stylesheet")) {
          return;
        }
      }
    } else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
      return;
    }
    const link = document.createElement("link");
    link.rel = isCss ? "stylesheet" : scriptRel;
    if (!isCss) {
      link.as = "script";
      link.crossOrigin = "";
    }
    link.href = dep;
    document.head.appendChild(link);
    if (isCss) {
      return new Promise((res, rej) => {
        link.addEventListener("load", res);
        link.addEventListener("error", () => rej(new Error(`Unable to preload CSS for ${dep}`)));
      });
    }
  })).then(() => baseModule()).catch((err) => {
    const e = new Event("vite:preloadError", { cancelable: true });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  });
};
const DEFAULT_TIMEOUT = 6e4;
function defaultSerialize(i) {
  return i;
}
const defaultDeserialize = defaultSerialize;
const { setTimeout: setTimeout$1 } = globalThis;
const random = Math.random.bind(Math);
function createBirpc(functions, options) {
  const {
    post,
    on,
    eventNames = [],
    serialize = defaultSerialize,
    deserialize = defaultDeserialize,
    resolver,
    timeout = DEFAULT_TIMEOUT
  } = options;
  const rpcPromiseMap = /* @__PURE__ */ new Map();
  let _promise;
  const rpc2 = new Proxy({}, {
    get(_, method) {
      if (method === "$functions")
        return functions;
      const sendEvent = (...args) => {
        post(serialize({ m: method, a: args, t: "q" }));
      };
      if (eventNames.includes(method)) {
        sendEvent.asEvent = sendEvent;
        return sendEvent;
      }
      const sendCall = async (...args) => {
        await _promise;
        return new Promise((resolve2, reject) => {
          const id = nanoid();
          rpcPromiseMap.set(id, { resolve: resolve2, reject });
          post(serialize({ m: method, a: args, i: id, t: "q" }));
          if (timeout >= 0) {
            setTimeout$1(() => {
              reject(new Error(`[birpc] timeout on calling "${method}"`));
              rpcPromiseMap.delete(id);
            }, timeout);
          }
        });
      };
      sendCall.asEvent = sendEvent;
      return sendCall;
    }
  });
  _promise = on(async (data, ...extra) => {
    const msg = deserialize(data);
    if (msg.t === "q") {
      const { m: method, a: args } = msg;
      let result, error;
      const fn = resolver ? resolver(method, functions[method]) : functions[method];
      if (!fn) {
        error = new Error(`[birpc] function "${method}" not found`);
      } else {
        try {
          result = await fn.apply(rpc2, args);
        } catch (e) {
          error = e;
        }
      }
      if (msg.i) {
        if (error && options.onError)
          options.onError(error, method, args);
        post(serialize({ t: "s", i: msg.i, r: result, e: error }), ...extra);
      }
    } else {
      const { i: ack, r: result, e: error } = msg;
      const promise = rpcPromiseMap.get(ack);
      if (promise) {
        if (error)
          promise.reject(error);
        else
          promise.resolve(result);
      }
      rpcPromiseMap.delete(ack);
    }
  });
  return rpc2;
}
const urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
function nanoid(size = 21) {
  let id = "";
  let i = size;
  while (i--)
    id += urlAlphabet[random() * 64 | 0];
  return id;
}
/*! (c) 2020 Andrea Giammarchi */
const { parse: $parse, stringify: $stringify } = JSON;
const { keys } = Object;
const Primitive = String;
const primitive = "string";
const ignore = {};
const object = "object";
const noop = (_, value) => value;
const primitives = (value) => value instanceof Primitive ? Primitive(value) : value;
const Primitives = (_, value) => typeof value === primitive ? new Primitive(value) : value;
const revive = (input, parsed, output, $) => {
  const lazy = [];
  for (let ke = keys(output), { length } = ke, y = 0; y < length; y++) {
    const k = ke[y];
    const value = output[k];
    if (value instanceof Primitive) {
      const tmp = input[value];
      if (typeof tmp === object && !parsed.has(tmp)) {
        parsed.add(tmp);
        output[k] = ignore;
        lazy.push({ k, a: [input, parsed, tmp, $] });
      } else
        output[k] = $.call(output, k, tmp);
    } else if (output[k] !== ignore)
      output[k] = $.call(output, k, value);
  }
  for (let { length } = lazy, i = 0; i < length; i++) {
    const { k, a } = lazy[i];
    output[k] = $.call(output, k, revive.apply(null, a));
  }
  return output;
};
const set = (known, input, value) => {
  const index = Primitive(input.push(value) - 1);
  known.set(value, index);
  return index;
};
const parse = (text, reviver) => {
  const input = $parse(text, Primitives).map(primitives);
  const value = input[0];
  const $ = reviver || noop;
  const tmp = typeof value === object && value ? revive(input, /* @__PURE__ */ new Set(), value, $) : value;
  return $.call({ "": tmp }, "", tmp);
};
const stringify = (value, replacer, space) => {
  const $ = replacer && typeof replacer === object ? (k, v) => k === "" || -1 < replacer.indexOf(k) ? v : void 0 : replacer || noop;
  const known = /* @__PURE__ */ new Map();
  const input = [];
  const output = [];
  let i = +set(known, input, $.call({ "": value }, "", value));
  let firstRun = !i;
  while (i < input.length) {
    firstRun = true;
    output[i] = $stringify(input[i++], replace, space);
  }
  return "[" + output.join(",") + "]";
  function replace(key, value2) {
    if (firstRun) {
      firstRun = !firstRun;
      return value2;
    }
    const after = $.call(this, key, value2);
    switch (typeof after) {
      case object:
        if (after === null)
          return after;
      case primitive:
        return known.get(after) || set(known, input, after);
    }
    return after;
  }
};
function normalizeWindowsPath(input = "") {
  if (!input || !input.includes("\\")) {
    return input;
  }
  return input.replace(/\\/g, "/");
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
function cwd() {
  if (typeof process !== "undefined") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1)
        ;
      else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const relative = function(from, to) {
  const _from = resolve(from).split("/");
  const _to = resolve(to).split("/");
  const _fromCopy = [..._from];
  for (const segment of _fromCopy) {
    if (_to[0] !== segment) {
      break;
    }
    _from.shift();
    _to.shift();
  }
  return [..._from.map(() => ".."), ..._to].join("/");
};
function isAggregateError(err) {
  if (typeof AggregateError !== "undefined" && err instanceof AggregateError)
    return true;
  return err instanceof Error && "errors" in err;
}
class StateManager {
  constructor() {
    __publicField(this, "filesMap", /* @__PURE__ */ new Map());
    __publicField(this, "pathsSet", /* @__PURE__ */ new Set());
    __publicField(this, "browserTestPromises", /* @__PURE__ */ new Map());
    __publicField(this, "idMap", /* @__PURE__ */ new Map());
    __publicField(this, "taskFileMap", /* @__PURE__ */ new WeakMap());
    __publicField(this, "errorsSet", /* @__PURE__ */ new Set());
    __publicField(this, "processTimeoutCauses", /* @__PURE__ */ new Set());
  }
  catchError(err, type) {
    if (isAggregateError(err))
      return err.errors.forEach((error) => this.catchError(error, type));
    if (err === Object(err))
      err.type = type;
    else
      err = { type, message: err };
    const _err = err;
    if (_err && typeof _err === "object" && _err.code === "VITEST_PENDING") {
      const task = this.idMap.get(_err.taskId);
      if (task) {
        task.mode = "skip";
        task.result ?? (task.result = { state: "skip" });
        task.result.state = "skip";
      }
      return;
    }
    this.errorsSet.add(err);
  }
  clearErrors() {
    this.errorsSet.clear();
  }
  getUnhandledErrors() {
    return Array.from(this.errorsSet.values());
  }
  addProcessTimeoutCause(cause) {
    this.processTimeoutCauses.add(cause);
  }
  getProcessTimeoutCauses() {
    return Array.from(this.processTimeoutCauses.values());
  }
  getPaths() {
    return Array.from(this.pathsSet);
  }
  getFiles(keys2) {
    if (keys2)
      return keys2.map((key) => this.filesMap.get(key)).filter(Boolean).flat();
    return Array.from(this.filesMap.values()).flat();
  }
  getFilepaths() {
    return Array.from(this.filesMap.keys());
  }
  getFailedFilepaths() {
    return this.getFiles().filter((i) => {
      var _a;
      return ((_a = i.result) == null ? void 0 : _a.state) === "fail";
    }).map((i) => i.filepath);
  }
  collectPaths(paths = []) {
    paths.forEach((path) => {
      this.pathsSet.add(path);
    });
  }
  collectFiles(files = []) {
    files.forEach((file) => {
      const existing = this.filesMap.get(file.filepath) || [];
      const otherProject = existing.filter((i) => i.projectName !== file.projectName);
      otherProject.push(file);
      this.filesMap.set(file.filepath, otherProject);
      this.updateId(file);
    });
  }
  // this file is reused by ws-client, and shoult not rely on heavy dependencies like workspace
  clearFiles(_project, paths = []) {
    const project = _project;
    paths.forEach((path) => {
      const files = this.filesMap.get(path);
      if (!files)
        return;
      const filtered = files.filter((file) => file.projectName !== project.config.name);
      if (!filtered.length)
        this.filesMap.delete(path);
      else
        this.filesMap.set(path, filtered);
    });
  }
  updateId(task) {
    if (this.idMap.get(task.id) === task)
      return;
    this.idMap.set(task.id, task);
    if (task.type === "suite") {
      task.tasks.forEach((task2) => {
        this.updateId(task2);
      });
    }
  }
  updateTasks(packs) {
    for (const [id, result, meta] of packs) {
      const task = this.idMap.get(id);
      if (task) {
        task.result = result;
        task.meta = meta;
        if ((result == null ? void 0 : result.state) === "skip")
          task.mode = "skip";
      }
    }
  }
  updateUserLog(log) {
    const task = log.taskId && this.idMap.get(log.taskId);
    if (task) {
      if (!task.logs)
        task.logs = [];
      task.logs.push(log);
    }
  }
  getCountOfFailedTests() {
    return Array.from(this.idMap.values()).filter((t) => {
      var _a;
      return ((_a = t.result) == null ? void 0 : _a.state) === "fail";
    }).length;
  }
  cancelFiles(files, root) {
    this.collectFiles(files.map((filepath) => ({
      filepath,
      name: relative(root, filepath),
      id: filepath,
      mode: "skip",
      type: "suite",
      result: {
        state: "skip"
      },
      meta: {},
      // Cancelled files have not yet collected tests
      tasks: []
    })));
  }
}
function createClient(url2, options = {}) {
  const {
    handlers = {},
    autoReconnect = true,
    reconnectInterval = 2e3,
    reconnectTries = 10,
    reactive = (v) => v,
    WebSocketConstructor = globalThis.WebSocket
  } = options;
  let tries = reconnectTries;
  const ctx = reactive({
    ws: new WebSocketConstructor(url2),
    state: new StateManager(),
    waitForConnection,
    reconnect
  });
  ctx.state.filesMap = reactive(ctx.state.filesMap);
  ctx.state.idMap = reactive(ctx.state.idMap);
  let onMessage;
  const functions = {
    onPathsCollected(paths) {
      var _a;
      ctx.state.collectPaths(paths);
      (_a = handlers.onPathsCollected) == null ? void 0 : _a.call(handlers, paths);
    },
    onCollected(files) {
      var _a;
      ctx.state.collectFiles(files);
      (_a = handlers.onCollected) == null ? void 0 : _a.call(handlers, files);
    },
    onTaskUpdate(packs) {
      var _a;
      ctx.state.updateTasks(packs);
      (_a = handlers.onTaskUpdate) == null ? void 0 : _a.call(handlers, packs);
    },
    onUserConsoleLog(log) {
      ctx.state.updateUserLog(log);
    },
    onFinished(files) {
      var _a;
      (_a = handlers.onFinished) == null ? void 0 : _a.call(handlers, files);
    },
    onCancel(reason) {
      var _a;
      (_a = handlers.onCancel) == null ? void 0 : _a.call(handlers, reason);
    }
  };
  const birpcHandlers = {
    post: (msg) => ctx.ws.send(msg),
    on: (fn) => onMessage = fn,
    serialize: stringify,
    deserialize: parse
  };
  ctx.rpc = createBirpc(
    functions,
    birpcHandlers
  );
  let openPromise;
  function reconnect(reset = false) {
    if (reset)
      tries = reconnectTries;
    ctx.ws = new WebSocketConstructor(url2);
    registerWS();
  }
  function registerWS() {
    openPromise = new Promise((resolve2) => {
      ctx.ws.addEventListener("open", () => {
        tries = reconnectTries;
        resolve2();
      });
    });
    ctx.ws.addEventListener("message", (v) => {
      onMessage(v.data);
    });
    ctx.ws.addEventListener("close", () => {
      tries -= 1;
      if (autoReconnect && tries > 0)
        setTimeout(reconnect, reconnectInterval);
    });
  }
  registerWS();
  function waitForConnection() {
    return openPromise;
  }
  return ctx;
}
const { get } = Reflect;
function withSafeTimers(getTimers, fn) {
  var _a;
  const { setTimeout: setTimeout2, clearTimeout, nextTick, setImmediate, clearImmediate } = getTimers();
  const currentSetTimeout = globalThis.setTimeout;
  const currentClearTimeout = globalThis.clearTimeout;
  const currentSetImmediate = globalThis.setImmediate;
  const currentClearImmediate = globalThis.clearImmediate;
  const currentNextTick = (_a = globalThis.process) == null ? void 0 : _a.nextTick;
  try {
    globalThis.setTimeout = setTimeout2;
    globalThis.clearTimeout = clearTimeout;
    globalThis.setImmediate = setImmediate;
    globalThis.clearImmediate = clearImmediate;
    if (globalThis.process)
      globalThis.process.nextTick = nextTick;
    const result = fn();
    return result;
  } finally {
    globalThis.setTimeout = currentSetTimeout;
    globalThis.clearTimeout = currentClearTimeout;
    globalThis.setImmediate = currentSetImmediate;
    globalThis.clearImmediate = currentClearImmediate;
    if (globalThis.process) {
      nextTick(() => {
        globalThis.process.nextTick = currentNextTick;
      });
    }
  }
}
const promises = /* @__PURE__ */ new Set();
async function rpcDone() {
  if (!promises.size)
    return;
  const awaitable = Array.from(promises);
  return Promise.all(awaitable);
}
function createSafeRpc(client2, getTimers) {
  return new Proxy(client2.rpc, {
    get(target, p, handler) {
      const sendCall = get(target, p, handler);
      const safeSendCall = (...args) => withSafeTimers(getTimers, async () => {
        const result = sendCall(...args);
        promises.add(result);
        try {
          return await result;
        } finally {
          promises.delete(result);
        }
      });
      safeSendCall.asEvent = sendCall.asEvent;
      return safeSendCall;
    }
  });
}
function rpc() {
  return globalThis.__vitest_worker__.safeRpc;
}
function createBrowserRunner(original, coverageModule) {
  return class BrowserTestRunner extends original {
    constructor(options) {
      super(options.config);
      __publicField(this, "config");
      __publicField(this, "hashMap", /* @__PURE__ */ new Map());
      this.config = options.config;
      this.hashMap = options.browserHashMap;
    }
    async onAfterRunTest(task) {
      var _a, _b, _c, _d, _e;
      await ((_a = super.onAfterRunTest) == null ? void 0 : _a.call(this, task));
      (_c = (_b = task.result) == null ? void 0 : _b.errors) == null ? void 0 : _c.forEach((error) => {
        console.error(error.message);
      });
      if (this.config.bail && ((_d = task.result) == null ? void 0 : _d.state) === "fail") {
        const previousFailures = await rpc().getCountOfFailedTests();
        const currentFailures = 1 + previousFailures;
        if (currentFailures >= this.config.bail) {
          rpc().onCancel("test-failure");
          (_e = this.onCancel) == null ? void 0 : _e.call(this, "test-failure");
        }
      }
    }
    async onAfterRun() {
      var _a, _b;
      await ((_a = super.onAfterRun) == null ? void 0 : _a.call(this));
      const coverage = await ((_b = coverageModule == null ? void 0 : coverageModule.takeCoverage) == null ? void 0 : _b.call(coverageModule));
      if (coverage)
        await rpc().onAfterSuiteRun({ coverage });
    }
    onCollected(files) {
      return rpc().onCollected(files);
    }
    onTaskUpdate(task) {
      return rpc().onTaskUpdate(task);
    }
    async importFile(filepath) {
      let [test, hash] = this.hashMap.get(filepath) ?? [false, ""];
      if (hash === "") {
        hash = Date.now().toString();
        this.hashMap.set(filepath, [false, hash]);
      }
      const importpath = /^\w:/.test(filepath) ? `/@fs/${filepath}?${test ? "browserv" : "v"}=${hash}` : `${filepath}?${test ? "browserv" : "v"}=${hash}`;
      await __vitePreload(() => import(importpath), true ? [] : void 0);
    }
  };
}
function importId(id) {
  const name = `/@id/${id}`;
  return __vi_wrap_module__(__vitePreload(() => import(name), true ? [] : void 0));
}
const { Date: Date$1, console: console$1 } = globalThis;
async function setupConsoleLogSpy() {
  const { stringify: stringify2, format, inspect } = await importId("vitest/utils");
  const { log, info, error, dir, dirxml, trace, time, timeEnd, timeLog, warn, debug, count, countReset } = console$1;
  const formatInput = (input) => {
    if (input instanceof Node)
      return stringify2(input);
    return format(input);
  };
  const processLog = (args) => args.map(formatInput).join(" ");
  const sendLog = (type, content) => {
    var _a, _b;
    if (content.startsWith("[vite]"))
      return;
    const unknownTestId = "__vitest__unknown_test__";
    const taskId = ((_b = (_a = globalThis.__vitest_worker__) == null ? void 0 : _a.current) == null ? void 0 : _b.id) ?? unknownTestId;
    rpc().sendLog({
      content,
      time: Date$1.now(),
      taskId,
      type,
      size: content.length
    });
  };
  const stdout = (base) => (...args) => {
    sendLog("stdout", processLog(args));
    return base(...args);
  };
  const stderr = (base) => (...args) => {
    sendLog("stderr", processLog(args));
    return base(...args);
  };
  console$1.log = stdout(log);
  console$1.debug = stdout(debug);
  console$1.info = stdout(info);
  console$1.error = stderr(error);
  console$1.warn = stderr(warn);
  console$1.dir = (item, options) => {
    sendLog("stdout", inspect(item, options));
    return dir(item, options);
  };
  console$1.dirxml = (...args) => {
    sendLog("stdout", processLog(args));
    return dirxml(...args);
  };
  console$1.trace = (...args) => {
    const content = processLog(args);
    const error2 = new Error("Trace");
    const stack = (error2.stack || "").split("\n").slice(2).join("\n");
    sendLog("stdout", `${content}
${stack}`);
    return trace(...args);
  };
  const timeLabels = {};
  console$1.time = (label = "default") => {
    const now = performance.now();
    time(label);
    timeLabels[label] = now;
  };
  console$1.timeLog = (label = "default") => {
    timeLog(label);
    if (!(label in timeLabels))
      sendLog("stderr", `Timer "${label}" does not exist`);
    else
      sendLog("stdout", `${label}: ${timeLabels[label]} ms`);
  };
  console$1.timeEnd = (label = "default") => {
    const end = performance.now();
    timeEnd(label);
    const start = timeLabels[label];
    if (!(label in timeLabels)) {
      sendLog("stderr", `Timer "${label}" does not exist`);
    } else if (start) {
      const duration = end - start;
      sendLog("stdout", `${label}: ${duration} ms`);
    }
  };
  const countLabels = {};
  console$1.count = (label = "default") => {
    const counter = (countLabels[label] ?? 0) + 1;
    countLabels[label] = counter;
    sendLog("stdout", `${label}: ${counter}`);
    return count(label);
  };
  console$1.countReset = (label = "default") => {
    countLabels[label] = 0;
    return countReset(label);
  };
}
function showPopupWarning(name, value, defaultValue) {
  return (...params) => {
    const formatedParams = params.map((p) => JSON.stringify(p)).join(", ");
    console.warn(`Vitest encountered a \`${name}(${formatedParams})\` call that it cannot handle by default, so it returned \`${value}\`. Read more in https://vitest.dev/guide/browser#thread-blocking-dialogs.
If needed, mock the \`${name}\` call manually like:

\`\`\`
import { expect, vi } from "vitest"

vi.spyOn(window, "${name}")${defaultValue ? `.mockReturnValue(${JSON.stringify(defaultValue)})` : ""}
${name}(${formatedParams})
expect(${name}).toHaveBeenCalledWith(${formatedParams})
\`\`\``);
    return value;
  };
}
function setupDialogsSpy() {
  globalThis.alert = showPopupWarning("alert", void 0);
  globalThis.confirm = showPopupWarning("confirm", false, true);
  globalThis.prompt = showPopupWarning("prompt", null, "your value");
}
class BrowserSnapshotEnvironment {
  getVersion() {
    return "1";
  }
  getHeader() {
    return `// Vitest Snapshot v${this.getVersion()}, https://vitest.dev/guide/snapshot.html`;
  }
  readSnapshotFile(filepath) {
    return rpc().readSnapshotFile(filepath);
  }
  saveSnapshotFile(filepath, snapshot) {
    return rpc().saveSnapshotFile(filepath, snapshot);
  }
  resolvePath(filepath) {
    return rpc().resolveSnapshotPath(filepath);
  }
  resolveRawPath(testPath, rawPath) {
    return rpc().resolveSnapshotRawPath(testPath, rawPath);
  }
  removeSnapshotFile(filepath) {
    return rpc().removeSnapshotFile(filepath);
  }
}
function throwNotImplemented(name) {
  throw new Error(`[vitest] ${name} is not implemented in browser environment yet.`);
}
class VitestBrowserClientMocker {
  importActual() {
    throwNotImplemented("importActual");
  }
  importMock() {
    throwNotImplemented("importMock");
  }
  queueMock() {
    throwNotImplemented("queueMock");
  }
  queueUnmock() {
    throwNotImplemented("queueUnmock");
  }
  prepare() {
  }
}
const PORT = location.port;
const HOST = [location.hostname, PORT].filter(Boolean).join(":");
const ENTRY_URL = `${location.protocol === "https:" ? "wss:" : "ws:"}//${HOST}/__vitest_api__`;
let config;
let runner;
const browserHashMap = /* @__PURE__ */ new Map();
const url = new URL(location.href);
const testId = url.searchParams.get("id") || "unknown";
function getQueryPaths() {
  return url.searchParams.getAll("path");
}
let setCancel = (_) => {
};
const onCancel = new Promise((resolve2) => {
  setCancel = resolve2;
});
const client = createClient(ENTRY_URL, {
  handlers: {
    onCancel: setCancel
  }
});
const ws = client.ws;
async function loadConfig() {
  let retries = 5;
  do {
    try {
      await new Promise((resolve2) => setTimeout(resolve2, 150));
      config = await client.rpc.getConfig();
      return;
    } catch (_) {
    }
  } while (--retries > 0);
  throw new Error("cannot load configuration after 5 retries");
}
ws.addEventListener("open", async () => {
  await loadConfig();
  const { getSafeTimers } = await importId("vitest/utils");
  const safeRpc = createSafeRpc(client, getSafeTimers);
  globalThis.__vitest_browser__ = true;
  globalThis.__vitest_worker__ = {
    config,
    browserHashMap,
    environment: {
      name: "browser"
    },
    // @ts-expect-error untyped global for internal use
    moduleCache: globalThis.__vi_module_cache__,
    rpc: client.rpc,
    safeRpc,
    durations: {
      environment: 0,
      prepare: 0
    }
  };
  globalThis.__vitest_mocker__ = new VitestBrowserClientMocker();
  const paths = getQueryPaths();
  const iFrame = document.getElementById("vitest-ui");
  iFrame.setAttribute("src", "/__vitest__/");
  await setupConsoleLogSpy();
  setupDialogsSpy();
  await runTests(paths, config);
});
async function runTests(paths, config2) {
  const viteClientPath = "/@vite/client";
  await __vitePreload(() => import(viteClientPath), true ? [] : void 0);
  const {
    startTests,
    setupCommonEnv,
    loadDiffConfig,
    takeCoverageInsideWorker
  } = await importId("vitest/browser");
  const executor = {
    executeId: (id) => importId(id)
  };
  if (!runner) {
    const { VitestTestRunner } = await importId("vitest/runners");
    const BrowserRunner = createBrowserRunner(VitestTestRunner, { takeCoverage: () => takeCoverageInsideWorker(config2.coverage, executor) });
    runner = new BrowserRunner({ config: config2, browserHashMap });
  }
  onCancel.then((reason) => {
    var _a;
    (_a = runner == null ? void 0 : runner.onCancel) == null ? void 0 : _a.call(runner, reason);
  });
  if (!config2.snapshotOptions.snapshotEnvironment)
    config2.snapshotOptions.snapshotEnvironment = new BrowserSnapshotEnvironment();
  try {
    runner.config.diffOptions = await loadDiffConfig(config2, executor);
    await setupCommonEnv(config2);
    const files = paths.map((path) => {
      return `${config2.root}/${path}`.replace(/\/+/g, "/");
    });
    const now = `${(/* @__PURE__ */ new Date()).getTime()}`;
    files.forEach((i) => browserHashMap.set(i, [true, now]));
    for (const file of files)
      await startTests([file], runner);
  } finally {
    await rpcDone();
    await rpc().onDone(testId);
  }
}
