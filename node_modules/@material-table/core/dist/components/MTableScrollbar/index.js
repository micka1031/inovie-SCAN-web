"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _Box2 = _interopRequireDefault(require("@mui/material/Box"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _react = _interopRequireDefault(require("react"));
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
var doubleStyle = {
  overflowX: 'auto',
  position: 'relative'
};
var singleStyle = _objectSpread(_objectSpread({}, doubleStyle), {}, {
  '& ::-webkit-scrollbar': {
    WebkitAppearance: 'none'
  },
  '& ::-webkit-scrollbar:horizontal': {
    height: 8
  },
  '& ::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(0, 0, 0, .3)',
    border: '2px solid white',
    borderRadius: 4
  }
});
var ScrollBar = function ScrollBar(_ref) {
  var _double = _ref["double"],
    children = _ref.children;
  return /*#__PURE__*/_react["default"].createElement(_Box2["default"], {
    sx: _double ? doubleStyle : singleStyle
  }, children);
};
var _default = exports["default"] = ScrollBar;