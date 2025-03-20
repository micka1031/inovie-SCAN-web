"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateInput = validateInput;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function validateInput(columnDef, data) {
  if (columnDef.validate) {
    var validateResponse = columnDef.validate(data);
    switch ((0, _typeof2["default"])(validateResponse)) {
      case 'object':
        return _objectSpread({}, validateResponse);
      case 'boolean':
        return {
          isValid: validateResponse,
          helperText: ''
        };
      case 'string':
        return {
          isValid: false,
          helperText: validateResponse
        };
      default:
        return {
          isValid: true,
          helperText: ''
        };
    }
  }
  return {
    isValid: true,
    helperText: ''
  };
}