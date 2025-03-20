"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof3 = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MTableSummaryRow = MTableSummaryRow;
exports["default"] = void 0;
var _TableRow2 = _interopRequireDefault(require("@mui/material/TableRow"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _TableCell2 = _interopRequireDefault(require("@mui/material/TableCell"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var React = _interopRequireWildcard(require("react"));
var _utils = require("../../utils");
var CommonValues = _interopRequireWildcard(require("../../utils/common-values"));
var _store = require("../../store");
var _propTypes = _interopRequireDefault(require("prop-types"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof3(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function MTableSummaryRow(_ref) {
  var columns = _ref.columns,
    rowProps = _ref.rowProps,
    renderSummaryRow = _ref.renderSummaryRow;
  var options = (0, _store.useOptionStore)();
  if (!renderSummaryRow) {
    return null;
  }
  function renderPlaceholderColumn(key) {
    var numIcons = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var size = CommonValues.elementSize(_objectSpread(_objectSpread({}, rowProps), {}, {
      options: options
    }));
    var width = numIcons * CommonValues.baseIconSize(_objectSpread(_objectSpread({}, rowProps), {}, {
      options: options
    }));
    return /*#__PURE__*/React.createElement(_TableCell2["default"], {
      key: "placeholder.".concat(key),
      size: size,
      padding: "none",
      style: {
        width: width,
        padding: '0px 5px',
        boxSizing: 'border-box'
      }
    });
  }
  var placeholderLeftColumns = [];
  var placeholderRightColumns = [];
  var placeholderKey = 0;

  // Create empty columns corresponding to selection, actions, detail panel, and tree data icons
  if (options.selection) {
    placeholderLeftColumns.push(renderPlaceholderColumn(placeholderKey++));
  }
  if (rowProps.actions && rowProps.actions.filter(function (a) {
    return a.position === 'row' || typeof a === 'function';
  }).length > 0) {
    var numRowActions = CommonValues.rowActions(rowProps).length;
    if (options.actionsColumnIndex === -1) {
      placeholderRightColumns.push(renderPlaceholderColumn(placeholderKey++, numRowActions));
    } else if (options.actionsColumnIndex >= 0) {
      placeholderLeftColumns.push(renderPlaceholderColumn(placeholderKey++, numRowActions));
    }
  }
  if (rowProps.detailPanel && options.showDetailPanelIcon) {
    if (options.detailPanelColumnAlignment === 'right') {
      placeholderRightColumns.push(renderPlaceholderColumn(placeholderKey++));
    } else {
      placeholderLeftColumns.push(renderPlaceholderColumn(placeholderKey++));
    }
  }
  if (rowProps.isTreeData) {
    placeholderLeftColumns.push(renderPlaceholderColumn(placeholderKey++));
  }
  return /*#__PURE__*/React.createElement(_TableRow2["default"], null, placeholderLeftColumns, (0, _toConsumableArray2["default"])(columns).sort(function (a, b) {
    return a.tableData.columnOrder - b.tableData.columnOrder;
  }).map(function (column, index) {
    var summaryColumn = renderSummaryRow({
      index: column.tableData.columnOrder,
      column: column,
      columns: columns
    });
    var cellAlignment = column.align !== undefined ? column.align : ['numeric', 'currency'].indexOf(column.type) !== -1 ? 'right' : 'left';
    var value = '';
    var style = (0, _utils.getStyle)({
      columnDef: column,
      scrollWidth: 0
    });
    if ((0, _typeof2["default"])(summaryColumn) === 'object' && summaryColumn !== null) {
      value = summaryColumn.value;
      style = summaryColumn.style;
    } else {
      value = summaryColumn;
    }
    return /*#__PURE__*/React.createElement(_TableCell2["default"], {
      key: index,
      style: style,
      align: cellAlignment
    }, value);
  }), placeholderRightColumns);
}
MTableSummaryRow.propTypes = {
  columns: _propTypes["default"].array,
  renderSummaryRow: _propTypes["default"].func
};
var _default = exports["default"] = MTableSummaryRow;