"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));
var _TableCell = _interopRequireDefault(require("@mui/material/TableCell"));
var _TableRow = _interopRequireDefault(require("@mui/material/TableRow"));
var _IconButton = _interopRequireDefault(require("@mui/material/IconButton"));
var _Checkbox = _interopRequireDefault(require("@mui/material/Checkbox"));
var _propTypes = _interopRequireDefault(require("prop-types"));
var _react = _interopRequireDefault(require("react"));
var _store = require("../../store");
var _excluded = ["columns", "groups", "level"];
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function MTableGroupRow(_ref) {
  var _ref$columns = _ref.columns,
    columns = _ref$columns === void 0 ? defaultProps.columns : _ref$columns,
    _ref$groups = _ref.groups,
    groups = _ref$groups === void 0 ? defaultProps.groups : _ref$groups,
    _ref$level = _ref.level,
    level = _ref$level === void 0 ? 0 : _ref$level,
    props = (0, _objectWithoutProperties2["default"])(_ref, _excluded);
  var options = (0, _store.useOptionStore)();
  var icons = (0, _store.useIconStore)();
  var rotateIconStyle = function rotateIconStyle(isOpen) {
    return {
      transform: isOpen ? 'rotate(90deg)' : 'none'
    };
  };
  var colSpan = columns.filter(function (columnDef) {
    return !columnDef.hidden;
  }).length;
  options.selection && colSpan++;
  props.detailPanel && colSpan++;
  props.actions && props.actions.length > 0 && colSpan++;
  var column = groups[level];
  var detail;
  if (props.groupData.isExpanded) {
    if (groups.length > level + 1) {
      // Is there another group
      detail = props.groupData.groups.map(function (groupData, index) {
        return /*#__PURE__*/_react["default"].createElement(props.components.GroupRow, {
          actions: props.actions,
          key: groupData.value || '' + index,
          columns: columns,
          components: props.components,
          detailPanel: props.detailPanel,
          getFieldValue: props.getFieldValue,
          groupData: groupData,
          groups: groups,
          level: level + 1,
          path: [].concat((0, _toConsumableArray2["default"])(props.path), [index]),
          onGroupExpandChanged: props.onGroupExpandChanged,
          onGroupSelected: props.onGroupSelected,
          onRowSelected: props.onRowSelected,
          onRowClick: props.onRowClick,
          onToggleDetailPanel: props.onToggleDetailPanel,
          onTreeExpandChanged: props.onTreeExpandChanged,
          onEditingCanceled: props.onEditingCanceled,
          onEditingApproved: props.onEditingApproved,
          hasAnyEditingRow: props.hasAnyEditingRow,
          isTreeData: props.isTreeData,
          cellEditable: props.cellEditable,
          onCellEditStarted: props.onCellEditStarted,
          onCellEditFinished: props.onCellEditFinished,
          scrollWidth: props.scrollWidth,
          treeDataMaxLevel: props.treeDataMaxLevel
        });
      });
    } else {
      detail = props.groupData.data.map(function (rowData, index) {
        if (rowData.tableData.editing) {
          return /*#__PURE__*/_react["default"].createElement(props.components.EditRow, {
            columns: columns,
            components: props.components,
            data: rowData,
            path: [].concat((0, _toConsumableArray2["default"])(props.path), [rowData.tableData.uuid]),
            localization: props.localization,
            key: index,
            mode: rowData.tableData.editing,
            isTreeData: props.isTreeData,
            detailPanel: props.detailPanel,
            onEditingCanceled: props.onEditingCanceled,
            onEditingApproved: props.onEditingApproved,
            getFieldValue: props.getFieldValue,
            onBulkEditRowChanged: props.onBulkEditRowChanged,
            scrollWidth: props.scrollWidth
          });
        } else {
          return /*#__PURE__*/_react["default"].createElement(props.components.Row, {
            actions: props.actions,
            key: index,
            columns: columns,
            components: props.components,
            data: rowData,
            detailPanel: props.detailPanel,
            level: level + 1,
            getFieldValue: props.getFieldValue,
            path: [].concat((0, _toConsumableArray2["default"])(props.path), [rowData.tableData.uuid]),
            onRowSelected: props.onRowSelected,
            onRowClick: props.onRowClick,
            onToggleDetailPanel: props.onToggleDetailPanel,
            isTreeData: props.isTreeData,
            onTreeExpandChanged: props.onTreeExpandChanged,
            onEditingCanceled: props.onEditingCanceled,
            onEditingApproved: props.onEditingApproved,
            hasAnyEditingRow: props.hasAnyEditingRow,
            cellEditable: props.cellEditable,
            onCellEditStarted: props.onCellEditStarted,
            onCellEditFinished: props.onCellEditFinished,
            scrollWidth: props.scrollWidth,
            treeDataMaxLevel: props.treeDataMaxLevel
          });
        }
      });
    }
  }
  var freeCells = [];
  for (var i = 0; i < level; i++) {
    freeCells.push( /*#__PURE__*/_react["default"].createElement(_TableCell["default"], {
      padding: "checkbox",
      key: i
    }));
  }
  var value = props.groupData.value;
  if (column.lookup) {
    value = column.lookup[value];
  }
  var title = column.title;
  if (typeof options.groupTitle === 'function') {
    title = options.groupTitle(props.groupData);
  } else if (typeof column.groupTitle === 'function') {
    title = column.groupTitle(props.groupData);
  } else if (typeof title !== 'string') {
    title = /*#__PURE__*/_react["default"].cloneElement(title);
  }
  var separator = options.groupRowSeparator || ': ';
  var showSelectGroupCheckbox = options.selection && options.showSelectGroupCheckbox;
  var mapSelectedRows = function mapSelectedRows(groupData) {
    var totalRows = 0;
    var selectedRows = 0;
    if (showSelectGroupCheckbox) {
      if (groupData.data.length) {
        totalRows += groupData.data.length;
        groupData.data.forEach(function (row) {
          return row.tableData.checked && selectedRows++;
        });
      } else {
        groupData.groups.forEach(function (group) {
          var _mapSelectedRows = mapSelectedRows(group),
            _mapSelectedRows2 = (0, _slicedToArray2["default"])(_mapSelectedRows, 2),
            groupTotalRows = _mapSelectedRows2[0],
            groupSelectedRows = _mapSelectedRows2[1];
          totalRows += groupTotalRows;
          selectedRows += groupSelectedRows;
        });
      }
    }
    return [totalRows, selectedRows];
  };
  var _mapSelectedRows3 = mapSelectedRows(props.groupData),
    _mapSelectedRows4 = (0, _slicedToArray2["default"])(_mapSelectedRows3, 2),
    totalRows = _mapSelectedRows4[0],
    selectedRows = _mapSelectedRows4[1];
  if (options.showGroupingCount) {
    var _props$groupData$data, _props$groupData$data2;
    value += " (".concat((_props$groupData$data = (_props$groupData$data2 = props.groupData.data) === null || _props$groupData$data2 === void 0 ? void 0 : _props$groupData$data2.length) !== null && _props$groupData$data !== void 0 ? _props$groupData$data : 0, ")");
  }
  return /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_TableRow["default"], {
    ref: props.forwardedRef
  }, freeCells, /*#__PURE__*/_react["default"].createElement(props.components.Cell, {
    colSpan: colSpan,
    padding: "none",
    columnDef: column,
    value: value,
    icons: icons
  }, /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_IconButton["default"], {
    style: _objectSpread({
      transition: 'all ease 200ms'
    }, rotateIconStyle(props.groupData.isExpanded)),
    onClick: function onClick(event) {
      props.onGroupExpandChanged(props.path);
    },
    size: "large"
  }, /*#__PURE__*/_react["default"].createElement(icons.DetailPanel, {
    row: props,
    level: props.path.length - 1
  })), showSelectGroupCheckbox && /*#__PURE__*/_react["default"].createElement(_Checkbox["default"], {
    indeterminate: selectedRows > 0 && totalRows !== selectedRows,
    checked: totalRows === selectedRows,
    onChange: function onChange(event, checked) {
      return props.onGroupSelected && props.onGroupSelected(checked, props.groupData.path);
    },
    style: {
      marginRight: 8
    }
  }), /*#__PURE__*/_react["default"].createElement("b", null, title, separator)))), detail);
}
var defaultProps = {
  columns: [],
  groups: []
};
MTableGroupRow.propTypes = {
  actions: _propTypes["default"].array,
  columns: _propTypes["default"].arrayOf(_propTypes["default"].object),
  components: _propTypes["default"].object,
  cellEditable: _propTypes["default"].object,
  detailPanel: _propTypes["default"].oneOfType([_propTypes["default"].func, _propTypes["default"].arrayOf(_propTypes["default"].object)]),
  forwardedRef: _propTypes["default"].element,
  getFieldValue: _propTypes["default"].func,
  groupData: _propTypes["default"].object,
  groups: _propTypes["default"].arrayOf(_propTypes["default"].object),
  hasAnyEditingRow: _propTypes["default"].bool,
  icons: _propTypes["default"].object,
  isTreeData: _propTypes["default"].bool.isRequired,
  level: _propTypes["default"].number,
  localization: _propTypes["default"].object,
  onBulkEditRowChanged: _propTypes["default"].func,
  onCellEditFinished: _propTypes["default"].func,
  onCellEditStarted: _propTypes["default"].func,
  onEditingApproved: _propTypes["default"].func,
  onEditingCanceled: _propTypes["default"].func,
  onGroupExpandChanged: _propTypes["default"].func,
  onRowClick: _propTypes["default"].func,
  onGroupSelected: _propTypes["default"].func,
  onRowSelected: _propTypes["default"].func,
  onToggleDetailPanel: _propTypes["default"].func.isRequired,
  onTreeExpandChanged: _propTypes["default"].func.isRequired,
  path: _propTypes["default"].arrayOf(_propTypes["default"].number),
  scrollWidth: _propTypes["default"].number.isRequired,
  treeDataMaxLevel: _propTypes["default"].number
};
var _default = exports["default"] = /*#__PURE__*/_react["default"].forwardRef(function MTableGroupRowRef(props, ref) {
  return /*#__PURE__*/_react["default"].createElement(MTableGroupRow, (0, _extends2["default"])({}, props, {
    forwardedRef: ref
  }));
});