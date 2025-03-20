"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MTableFilterRow = MTableFilterRow;
exports.defaultProps = exports["default"] = void 0;
var _TableRow2 = _interopRequireDefault(require("@mui/material/TableRow"));
var _TableCell2 = _interopRequireDefault(require("@mui/material/TableCell"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));
var _react = _interopRequireDefault(require("react"));
var _propTypes = _interopRequireDefault(require("prop-types"));
var _DateFilter = _interopRequireDefault(require("./DateFilter"));
var _LookupFilter = _interopRequireDefault(require("./LookupFilter"));
var _DefaultFilter = _interopRequireDefault(require("./DefaultFilter"));
var _BooleanFilter = _interopRequireDefault(require("./BooleanFilter"));
var _Filter = _interopRequireDefault(require("./Filter"));
var _LocalizationStore = require("../../store/LocalizationStore");
var _excluded = ["columns", "hasActions"];
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
/**
 * MTableFilterRow is the row that is shown when `MaterialTable.options.filtering` is true.
 * This component allows you to provide a custom filtering algo or allow/disallow filtering for a column.
 *
 * THIS MUST BE EXPORTED (on top of the 'default' export)
 */
function MTableFilterRow(_ref) {
  var _ref$columns = _ref.columns,
    propColumns = _ref$columns === void 0 ? defaultProps.columns : _ref$columns,
    _ref$hasActions = _ref.hasActions,
    hasActions = _ref$hasActions === void 0 ? false : _ref$hasActions,
    props = (0, _objectWithoutProperties2["default"])(_ref, _excluded);
  var options = (0, _LocalizationStore.useOptionStore)();
  function getComponentForColumn(columnDef) {
    if (columnDef.filtering === false) {
      return null;
    }
    if (columnDef.field || columnDef.customFilterAndSearch) {
      if (columnDef.filterComponent) {
        return /*#__PURE__*/_react["default"].createElement(_Filter["default"], (0, _extends2["default"])({
          columnDef: columnDef
        }, props));
      } else if (columnDef.lookup) {
        return /*#__PURE__*/_react["default"].createElement(_LookupFilter["default"], (0, _extends2["default"])({
          columnDef: columnDef
        }, props));
      } else if (columnDef.type === 'boolean') {
        return /*#__PURE__*/_react["default"].createElement(_BooleanFilter["default"], (0, _extends2["default"])({
          columnDef: columnDef
        }, props));
      } else if (['date', 'datetime', 'time'].includes(columnDef.type)) {
        return /*#__PURE__*/_react["default"].createElement(_DateFilter["default"], (0, _extends2["default"])({
          columnDef: columnDef
        }, props));
      } else {
        return /*#__PURE__*/_react["default"].createElement(_DefaultFilter["default"], (0, _extends2["default"])({
          columnDef: columnDef
        }, props));
      }
    }
  }
  var columns = propColumns.filter(function (columnDef) {
    return !columnDef.hidden && !(columnDef.tableData.groupOrder > -1);
  }).sort(function (a, b) {
    return a.tableData.columnOrder - b.tableData.columnOrder;
  }).map(function (columnDef) {
    return /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
      key: columnDef.tableData.id,
      style: _objectSpread(_objectSpread({}, options.filterCellStyle), columnDef.filterCellStyle)
    }, getComponentForColumn(columnDef));
  });
  if (options.selection) {
    columns.splice(0, 0, /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
      padding: "none",
      key: "key-selection-column"
    }));
  }
  if (hasActions) {
    if (options.actionsColumnIndex === -1) {
      columns.push( /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
        key: "key-action-column"
      }));
    } else {
      var endPos = 0;
      if (props.selection) {
        endPos = 1;
      }
      columns.splice(options.actionsColumnIndex + endPos, 0, /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
        key: "key-action-column"
      }));
    }
  }
  if (props.hasDetailPanel && options.showDetailPanelIcon) {
    var index = options.detailPanelColumnAlignment === 'left' ? 0 : columns.length;
    columns.splice(index, 0, /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
      padding: "none",
      key: "key-detail-panel-column"
    }));
  }
  if (props.isTreeData > 0) {
    columns.splice(0, 0, /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
      padding: "none",
      key: 'key-tree-data-filter'
    }));
  }
  propColumns.filter(function (columnDef) {
    return columnDef.tableData.groupOrder > -1;
  }).forEach(function (columnDef) {
    columns.splice(0, 0, /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
      padding: "checkbox",
      key: 'key-group-filter' + columnDef.tableData.id
    }));
  });
  return /*#__PURE__*/_react["default"].createElement(_TableRow2["default"], {
    id: "m--table--filter--row",
    ref: props.forwardedRef,
    style: _objectSpread({
      height: 10
    }, options.filterRowStyle)
  }, columns);
}
var defaultProps = exports.defaultProps = {
  columns: [],
  localization: {
    filterTooltip: 'Filter'
  }
};
MTableFilterRow.propTypes = {
  columns: _propTypes["default"].array.isRequired,
  hasDetailPanel: _propTypes["default"].bool.isRequired,
  isTreeData: _propTypes["default"].bool.isRequired,
  onFilterChanged: _propTypes["default"].func.isRequired,
  hasActions: _propTypes["default"].bool,
  localization: _propTypes["default"].object
};
var _default = exports["default"] = /*#__PURE__*/_react["default"].forwardRef(function MTableFilterRowRef(props, ref) {
  return /*#__PURE__*/_react["default"].createElement(MTableFilterRow, (0, _extends2["default"])({}, props, {
    forwardedRef: ref
  }));
});