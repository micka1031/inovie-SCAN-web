"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var _FormControl2 = _interopRequireDefault(require("@mui/material/FormControl"));
var _Select2 = _interopRequireDefault(require("@mui/material/Select"));
var _MenuItem2 = _interopRequireDefault(require("@mui/material/MenuItem"));
var _ListItemText2 = _interopRequireDefault(require("@mui/material/ListItemText"));
var _Checkbox2 = _interopRequireDefault(require("@mui/material/Checkbox"));
var _InputLabel2 = _interopRequireDefault(require("@mui/material/InputLabel"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _react = _interopRequireWildcard(require("react"));
var _utils = require("./utils");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
var ITEM_HEIGHT = 48;
var ITEM_PADDING_TOP = 8;
var MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250
    }
  },
  variant: 'menu'
};
function LookupFilter(_ref) {
  var columnDef = _ref.columnDef,
    onFilterChanged = _ref.onFilterChanged,
    localization = _ref.localization,
    forwardedRef = _ref.forwardedRef;
  var _useState = (0, _react.useState)(columnDef.tableData.filterValue || []),
    _useState2 = (0, _slicedToArray2["default"])(_useState, 2),
    selectedFilter = _useState2[0],
    setSelectedFilter = _useState2[1];
  (0, _react.useEffect)(function () {
    setSelectedFilter(columnDef.tableData.filterValue || []);
  }, [columnDef.tableData.filterValue]);
  return /*#__PURE__*/_react["default"].createElement(_FormControl2["default"], {
    style: {
      width: '100%'
    },
    ref: forwardedRef
  }, /*#__PURE__*/_react["default"].createElement(_InputLabel2["default"], {
    htmlFor: 'select-multiple-checkbox' + columnDef.tableData.id,
    style: {
      marginTop: -16
    }
  }, (0, _utils.getLocalizedFilterPlaceHolder)(columnDef, localization)), /*#__PURE__*/_react["default"].createElement(_Select2["default"], {
    multiple: true,
    value: selectedFilter,
    onClose: function onClose() {
      if (columnDef.filterOnItemSelect !== true) {
        onFilterChanged(columnDef.tableData.id, selectedFilter);
      }
    },
    onChange: function onChange(event) {
      setSelectedFilter(event.target.value);
      if (columnDef.filterOnItemSelect === true) {
        onFilterChanged(columnDef.tableData.id, event.target.value);
      }
    },
    labelId: 'select-multiple-checkbox' + columnDef.tableData.id,
    renderValue: function renderValue(selectedArr) {
      return selectedArr.map(function (selected) {
        return columnDef.lookup[selected];
      }).join(', ');
    },
    MenuProps: MenuProps,
    style: {
      marginTop: 0
    }
  }, Object.keys(columnDef.lookup).map(function (key) {
    return /*#__PURE__*/_react["default"].createElement(_MenuItem2["default"], {
      key: key,
      value: key
    }, /*#__PURE__*/_react["default"].createElement(_Checkbox2["default"], {
      checked: selectedFilter.indexOf(key.toString()) > -1
    }), /*#__PURE__*/_react["default"].createElement(_ListItemText2["default"], {
      primary: columnDef.lookup[key]
    }));
  })));
}
var _default = exports["default"] = /*#__PURE__*/_react["default"].forwardRef(function LookupFilterRef(props, ref) {
  return /*#__PURE__*/_react["default"].createElement(LookupFilter, (0, _extends2["default"])({}, props, {
    forwardedRef: ref
  }));
});