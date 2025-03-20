"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var _react = _interopRequireWildcard(require("react"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
function Filter(_ref) {
  var columnDef = _ref.columnDef,
    onFilterChanged = _ref.onFilterChanged,
    forwardedRef = _ref.forwardedRef;
  return /*#__PURE__*/(0, _react.createElement)(columnDef.filterComponent, {
    columnDef: columnDef,
    onFilterChanged: onFilterChanged,
    forwardedRef: forwardedRef
  });
}
var _default = exports["default"] = /*#__PURE__*/_react["default"].forwardRef(function FilterRef(props, ref) {
  return /*#__PURE__*/_react["default"].createElement(Filter, (0, _extends2["default"])({}, props, {
    forwardedRef: ref
  }));
});