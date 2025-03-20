"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.widthToNumber = exports.selectionMaxWidth = exports.rowActions = exports.reducePercentsInCalc = exports.parseFirstLastPageButtons = exports.elementSize = exports.baseIconSize = exports.actionsColumnWidth = void 0;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
var elementSize = exports.elementSize = function elementSize(_ref) {
  var _ref$options = _ref.options,
    options = _ref$options === void 0 ? {} : _ref$options;
  return options.padding === 'normal' ? 'medium' : 'small';
};
var baseIconSize = exports.baseIconSize = function baseIconSize(props) {
  return elementSize(props) === 'medium' ? 48 : 32;
};
var rowActions = exports.rowActions = function rowActions(props) {
  return props.actions ? props.actions.filter(function (a) {
    return a.position === 'row' || typeof a === 'function';
  }) : [];
};
var actionsColumnWidth = exports.actionsColumnWidth = function actionsColumnWidth(props) {
  return rowActions(props).length * baseIconSize(props);
};
var selectionMaxWidth = exports.selectionMaxWidth = function selectionMaxWidth(props, maxTreeLevel) {
  return baseIconSize(props) + 9 * maxTreeLevel;
};
var reducePercentsInCalc = exports.reducePercentsInCalc = function reducePercentsInCalc(calc, fullValue) {
  if (!calc) return "".concat(fullValue, "px");
  var captureGroups = calc.match(/(\d*)%/);
  if (captureGroups && captureGroups.length > 1) {
    var percentage = captureGroups[1];
    return calc.replace(/\d*%/, "".concat(fullValue * (percentage / 100), "px"));
  }
  return calc.replace(/\d*%/, "".concat(fullValue, "px"));
};
var widthToNumber = exports.widthToNumber = function widthToNumber(width) {
  if (typeof width === 'number') return width;
  if (!width || !width.match(/^\s*\d+(px)?\s*$/)) return NaN;
  return Number(width.replace(/px$/, ''));
};
var parseFirstLastPageButtons = exports.parseFirstLastPageButtons = function parseFirstLastPageButtons(showFirstLastPageButtons, isRTL) {
  var result = {
    first: true,
    last: true
  };
  if (typeof showFirstLastPageButtons === 'boolean') {
    result = {
      first: showFirstLastPageButtons,
      last: showFirstLastPageButtons
    };
  } else if ((0, _typeof2["default"])(showFirstLastPageButtons) === 'object') {
    result = _objectSpread(_objectSpread({}, result), showFirstLastPageButtons);
  }
  if (isRTL) {
    result = {
      first: result.last,
      last: result.first
    };
  }
  return result;
};