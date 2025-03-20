"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getStyle = getStyle;
exports.setObjectByKey = exports.selectFromObject = void 0;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var CommonValues = _interopRequireWildcard(require("./common-values"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
var selectFromObject = exports.selectFromObject = function selectFromObject(o, s) {
  if (!s) {
    return;
  }
  var a;
  if (!Array.isArray(s)) {
    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s = s.replace(/^\./, ''); // strip a leading dot
    a = s.split('.');
  } else {
    a = s;
  }
  for (var i = 0, n = a.length; i < n; ++i) {
    var x = a[i];
    if (o && x in o) {
      o = o[x];
    } else {
      return;
    }
  }
  return o;
};
var setObjectByKey = exports.setObjectByKey = function setObjectByKey(obj, path, value) {
  var schema = obj; // a moving reference to internal objects within obj
  var pList;
  if (!Array.isArray(path)) {
    path = path.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    path = path.replace(/^\./, ''); // strip a leading dot
    pList = path.split('.');
  } else {
    pList = path;
  }
  var len = pList.length;
  for (var i = 0; i < len - 1; i++) {
    var elem = pList[i];
    if (!schema[elem]) schema[elem] = {};
    schema = schema[elem];
  }
  schema[pList[len - 1]] = value;
};
function getStyle(props) {
  var width = CommonValues.reducePercentsInCalc(props.columnDef.tableData.width, props.scrollWidth);
  var cellStyle = {
    color: 'inherit',
    width: width,
    maxWidth: props.columnDef.maxWidth,
    minWidth: props.columnDef.minWidth,
    boxSizing: 'border-box',
    fontSize: 'inherit',
    fontFamily: 'inherit',
    fontWeight: 'inherit'
  };
  if (typeof props.columnDef.cellStyle === 'function') {
    cellStyle = _objectSpread(_objectSpread({}, cellStyle), props.columnDef.cellStyle(props.value, props.rowData));
  } else {
    cellStyle = _objectSpread(_objectSpread({}, cellStyle), props.columnDef.cellStyle);
  }
  if (props.columnDef.disableClick) {
    cellStyle.cursor = 'default';
  }
  return _objectSpread(_objectSpread({}, props.style), cellStyle);
}