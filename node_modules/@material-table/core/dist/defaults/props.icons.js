"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _ViewColumn2 = _interopRequireDefault(require("@mui/icons-material/ViewColumn"));
var _Remove2 = _interopRequireDefault(require("@mui/icons-material/Remove"));
var _ArrowDownward2 = _interopRequireDefault(require("@mui/icons-material/ArrowDownward"));
var _Search2 = _interopRequireDefault(require("@mui/icons-material/Search"));
var _Replay2 = _interopRequireDefault(require("@mui/icons-material/Replay"));
var _Icon2 = _interopRequireDefault(require("@mui/material/Icon"));
var _ChevronLeft2 = _interopRequireDefault(require("@mui/icons-material/ChevronLeft"));
var _LastPage2 = _interopRequireDefault(require("@mui/icons-material/LastPage"));
var _FirstPage2 = _interopRequireDefault(require("@mui/icons-material/FirstPage"));
var _FilterList2 = _interopRequireDefault(require("@mui/icons-material/FilterList"));
var _SaveAlt2 = _interopRequireDefault(require("@mui/icons-material/SaveAlt"));
var _Edit2 = _interopRequireDefault(require("@mui/icons-material/Edit"));
var _ChevronRight2 = _interopRequireDefault(require("@mui/icons-material/ChevronRight"));
var _DeleteOutline2 = _interopRequireDefault(require("@mui/icons-material/DeleteOutline"));
var _Clear2 = _interopRequireDefault(require("@mui/icons-material/Clear"));
var _Check2 = _interopRequireDefault(require("@mui/icons-material/Check"));
var _AddBox2 = _interopRequireDefault(require("@mui/icons-material/AddBox"));
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var _react = _interopRequireWildcard(require("react"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
/**
 * Default data for `MaterialTable.icons` attribute
 */
/* eslint-disable react/display-name */
var _default = exports["default"] = {
  Add: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_AddBox2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "add_box"
    }));
  }),
  Check: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_Check2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "check"
    }));
  }),
  Clear: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_Clear2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "clear"
    }));
  }),
  Delete: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_DeleteOutline2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "delete_outline"
    }));
  }),
  DetailPanel: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_ChevronRight2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "chevron_right"
    }));
  }),
  Edit: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_Edit2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "edit"
    }));
  }),
  Export: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_SaveAlt2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "save_alt"
    }));
  }),
  Filter: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_FilterList2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "filter_list"
    }));
  }),
  FirstPage: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_FirstPage2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "first_page"
    }));
  }),
  LastPage: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_LastPage2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "last_page"
    }));
  }),
  NextPage: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_ChevronRight2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "chevron_right"
    }));
  }),
  PreviousPage: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_ChevronLeft2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "chevron_left"
    }));
  }),
  ResetSearch: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_Clear2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "clear"
    }));
  }),
  Resize: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_Icon2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "drag_handle"
    }), "|");
  }),
  Retry: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_Replay2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "replay"
    }));
  }),
  Search: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_Search2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "search"
    }));
  }),
  SortArrow: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_ArrowDownward2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "arrow_downward"
    }));
  }),
  ThirdStateCheck: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_Remove2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "remove"
    }));
  }),
  ViewColumn: /*#__PURE__*/(0, _react.forwardRef)(function (props, ref) {
    return /*#__PURE__*/_react["default"].createElement(_ViewColumn2["default"], (0, _extends2["default"])({}, props, {
      ref: ref,
      "data-testid": "view_column"
    }));
  })
};