"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = MTableCustomIcon;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _Icon2 = _interopRequireDefault(require("@mui/material/Icon"));
var _react = _interopRequireDefault(require("react"));
var _propTypes = _interopRequireDefault(require("prop-types"));
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function MTableCustomIcon(_ref) {
  var icon = _ref.icon,
    _ref$iconProps = _ref.iconProps,
    iconProps = _ref$iconProps === void 0 ? {} : _ref$iconProps;
  if (!icon) {
    return;
  }
  if (typeof icon === 'string') {
    return /*#__PURE__*/_react["default"].createElement(_Icon2["default"], iconProps, icon);
  }
  return /*#__PURE__*/_react["default"].createElement(icon, _objectSpread({}, iconProps));
}
MTableCustomIcon.propTypes = {
  icon: _propTypes["default"].oneOfType([_propTypes["default"].element, _propTypes["default"].elementType]).isRequired,
  iconProps: _propTypes["default"].object
};