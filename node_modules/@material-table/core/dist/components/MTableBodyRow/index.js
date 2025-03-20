"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _TableRow2 = _interopRequireDefault(require("@mui/material/TableRow"));
var _Tooltip2 = _interopRequireDefault(require("@mui/material/Tooltip"));
var _IconButton2 = _interopRequireDefault(require("@mui/material/IconButton"));
var _Checkbox2 = _interopRequireDefault(require("@mui/material/Checkbox"));
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var _TableCell2 = _interopRequireDefault(require("@mui/material/TableCell"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));
var _react = _interopRequireDefault(require("react"));
var _propTypes = _interopRequireDefault(require("prop-types"));
var _mTableDetailpanel = require("../m-table-detailpanel");
var CommonValues = _interopRequireWildcard(require("../../utils/common-values"));
var _useDoubleClick = require("../../utils/hooks/useDoubleClick");
var _ = require("./..");
var _store = require("../../store");
var _excluded = ["forwardedRef"],
  _excluded2 = ["data", "components", "detailPanel", "getFieldValue", "isTreeData", "onRowSelected", "onRowEditStarted", "onTreeExpandChanged", "onToggleDetailPanel", "onEditingCanceled", "onEditingApproved", "hasAnyEditingRow", "treeDataMaxLevel", "path", "actions", "errorState", "cellEditable", "onCellEditStarted", "onCellEditFinished", "persistEvents", "scrollWidth", "onRowClick", "onRowDoubleClick", "columns"]; // Third-party
// Internal
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function MTableBodyRow(_ref) {
  var forwardedRef = _ref.forwardedRef,
    props = (0, _objectWithoutProperties2["default"])(_ref, _excluded);
  var localization = (0, _store.useLocalizationStore)().body;
  var options = (0, _store.useOptionStore)();
  var icons = (0, _store.useIconStore)();
  var propsWithOptions = _objectSpread(_objectSpread({}, props), {}, {
    options: options
  });
  var _props$data = props.data,
    data = _props$data === void 0 ? {} : _props$data,
    components = props.components,
    detailPanel = props.detailPanel,
    getFieldValue = props.getFieldValue,
    isTreeData = props.isTreeData,
    onRowSelected = props.onRowSelected,
    onRowEditStarted = props.onRowEditStarted,
    onTreeExpandChanged = props.onTreeExpandChanged,
    onToggleDetailPanel = props.onToggleDetailPanel,
    onEditingCanceled = props.onEditingCanceled,
    onEditingApproved = props.onEditingApproved,
    hasAnyEditingRow = props.hasAnyEditingRow,
    treeDataMaxLevel = props.treeDataMaxLevel,
    _props$path = props.path,
    path = _props$path === void 0 ? [] : _props$path,
    _props$actions = props.actions,
    actions = _props$actions === void 0 ? [] : _props$actions,
    errorState = props.errorState,
    cellEditable = props.cellEditable,
    onCellEditStarted = props.onCellEditStarted,
    onCellEditFinished = props.onCellEditFinished,
    _props$persistEvents = props.persistEvents,
    persistEvents = _props$persistEvents === void 0 ? false : _props$persistEvents,
    scrollWidth = props.scrollWidth,
    onRowClick = props.onRowClick,
    onRowDoubleClick = props.onRowDoubleClick,
    propColumns = props.columns,
    rowProps = (0, _objectWithoutProperties2["default"])(props, _excluded2);
  var columns = propColumns.filter(function (columnDef) {
    return !columnDef.hidden;
  });
  var toggleDetailPanel = function toggleDetailPanel(panelIndex) {
    var panel = detailPanel;
    if (Array.isArray(panel)) {
      panel = panel[panelIndex || 0];
      if (typeof panel === 'function') {
        panel = panel(data);
      }
      panel = panel.render;
    }
    onToggleDetailPanel(path, panel);
  };
  var enableEditMode = function enableEditMode() {
    return onRowEditStarted(data);
  };
  // Make callbackActions a function to enable back wards compatibility
  var callbackActions = toggleDetailPanel;
  callbackActions.toggleDetailPanel = toggleDetailPanel;
  callbackActions.enableEditMode = enableEditMode;
  var onClick = function onClick(event, callback) {
    return callback(event, data, callbackActions);
  };
  var handleOnRowClick = (0, _useDoubleClick.useDoubleClick)(onRowClick ? function (e) {
    return onClick(e, onRowClick);
  } : undefined, onRowDoubleClick ? function (e) {
    return onClick(e, onRowDoubleClick);
  } : undefined);
  var getRenderColumns = function getRenderColumns() {
    var mapArr = columns.filter(function (columnDef) {
      return !(columnDef.tableData.groupOrder > -1);
    }).sort(function (a, b) {
      return a.tableData.columnOrder - b.tableData.columnOrder;
    }).map(function (columnDef) {
      var value = props.getFieldValue(data, columnDef);
      if (data.tableData.editCellList && data.tableData.editCellList.find(function (c) {
        return c.tableData.id === columnDef.tableData.id;
      })) {
        return /*#__PURE__*/_react["default"].createElement(props.components.EditCell, {
          getFieldValue: props.getFieldValue,
          components: props.components,
          icons: icons,
          localization: localization,
          columnDef: columnDef,
          size: size,
          key: 'cell-' + data.tableData.id + '-' + columnDef.tableData.id,
          rowData: data,
          cellEditable: props.cellEditable,
          onCellEditFinished: props.onCellEditFinished,
          scrollWidth: scrollWidth
        });
      } else {
        var isEditable = columnDef.editable !== 'never' && !!props.cellEditable;
        if (isEditable && props.cellEditable.isCellEditable) {
          isEditable = props.cellEditable.isCellEditable(data, columnDef);
        }
        var key = "cell-".concat(data.tableData.id, "-").concat(columnDef.tableData.id);
        return /*#__PURE__*/_react["default"].createElement(props.components.Cell, {
          size: size,
          errorState: props.errorState,
          columnDef: _objectSpread({
            cellStyle: options.cellStyle
          }, columnDef),
          value: value,
          key: key,
          rowData: data,
          cellEditable: isEditable,
          onCellEditStarted: props.onCellEditStarted,
          scrollWidth: scrollWidth
        });
      }
    });
    return mapArr;
  };
  var size = CommonValues.elementSize(propsWithOptions);
  var width = actions.length * CommonValues.baseIconSize(propsWithOptions);
  var renderActions = function renderActions(actions) {
    return /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
      size: size,
      padding: "none",
      key: "key-actions-column",
      style: _objectSpread({
        width: width,
        padding: '0px 5px',
        boxSizing: 'border-box'
      }, options.actionsCellStyle)
    }, /*#__PURE__*/_react["default"].createElement(props.components.Actions, {
      data: data,
      actions: actions,
      components: props.components,
      size: size,
      disabled: props.hasAnyEditingRow
    }));
  };
  var renderSelectionColumn = function renderSelectionColumn() {
    var checkboxProps = options.selectionProps || {};
    if (typeof checkboxProps === 'function') {
      checkboxProps = checkboxProps(data);
    }
    var selectionWidth = CommonValues.selectionMaxWidth(propsWithOptions, props.treeDataMaxLevel) || 0;
    var styles = size !== 'medium' ? {
      padding: '4px'
    } : undefined;
    return /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
      size: size,
      padding: "none",
      key: "key-selection-column",
      style: {
        width: selectionWidth
      }
    }, /*#__PURE__*/_react["default"].createElement(_Checkbox2["default"], (0, _extends2["default"])({
      size: size,
      checked: data.tableData.checked === true,
      onClick: function onClick(e) {
        return e.stopPropagation();
      },
      value: data.tableData.id.toString(),
      onChange: function onChange(event) {
        props.onRowSelected(event, path, data);
      },
      style: styles
    }, checkboxProps)));
  };
  var rotateIconStyle = function rotateIconStyle(isOpen) {
    return {
      transform: isOpen ? 'rotate(90deg)' : 'none'
    };
  };
  var renderDetailPanelColumn = function renderDetailPanelColumn() {
    if (!options.showDetailPanelIcon) {
      return null;
    }
    if (typeof props.detailPanel === 'function') {
      return /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
        size: size,
        padding: "none",
        key: "key-detail-panel-column",
        style: _objectSpread({
          width: 42,
          textAlign: 'center'
        }, options.detailPanelColumnStyle)
      }, /*#__PURE__*/_react["default"].createElement(_IconButton2["default"], {
        "aria-label": "Detail panel visibility toggle",
        size: size,
        style: _objectSpread({
          transition: 'all ease 200ms'
        }, rotateIconStyle(data.tableData.showDetailPanel)),
        onClick: function onClick(event) {
          props.onToggleDetailPanel(path, props.detailPanel);
          event.stopPropagation();
        }
      }, /*#__PURE__*/_react["default"].createElement(icons.DetailPanel, null)));
    } else {
      return /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
        size: size,
        padding: "none",
        key: "key-detail-panel-column"
      }, /*#__PURE__*/_react["default"].createElement("div", {
        style: _objectSpread({
          width: 42 * props.detailPanel.length,
          textAlign: 'center',
          display: 'flex'
        }, options.detailPanelColumnStyle)
      }, props.detailPanel.map(function (panel, index) {
        if (typeof panel === 'function') {
          panel = panel(data);
        }
        var isOpen = (data.tableData.showDetailPanel || '').toString() === panel.render.toString();
        var iconButton = /*#__PURE__*/_react["default"].createElement(icons.DetailPanel, null);
        var animation = true;
        if (isOpen) {
          if (panel.openIcon) {
            iconButton = /*#__PURE__*/_react["default"].createElement(_.MTableCustomIcon, {
              icon: panel.openIcon,
              iconProps: panel.iconProps
            });
            animation = false;
          } else if (panel.icon) {
            iconButton = /*#__PURE__*/_react["default"].createElement(_.MTableCustomIcon, {
              icon: panel.icon,
              iconProps: panel.iconProps
            });
          }
        } else if (panel.icon) {
          iconButton = /*#__PURE__*/_react["default"].createElement(_.MTableCustomIcon, {
            icon: panel.icon,
            iconProps: panel.iconProps
          });
          animation = false;
        }
        iconButton = /*#__PURE__*/_react["default"].createElement(_IconButton2["default"], {
          "aria-label": "Detail panel visibility toggle",
          size: size,
          key: 'key-detail-panel-' + index,
          style: _objectSpread({
            transition: 'all ease 200ms'
          }, rotateIconStyle(animation && isOpen)),
          disabled: panel.disabled,
          onClick: function onClick(event) {
            props.onToggleDetailPanel(path, panel.render);
            event.stopPropagation();
          }
        }, iconButton);
        if (panel.tooltip) {
          iconButton = /*#__PURE__*/_react["default"].createElement(_Tooltip2["default"], {
            key: 'key-detail-panel-' + index,
            title: panel.tooltip
          }, iconButton);
        }
        return iconButton;
      })));
    }
  };
  var renderTreeDataColumn = function renderTreeDataColumn() {
    if (data.tableData.childRows && data.tableData.childRows.length > 0) {
      return /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
        size: size,
        padding: "none",
        key: 'key-tree-data-column',
        style: {
          width: 48 + 9 * (props.treeDataMaxLevel - 2)
        }
      }, /*#__PURE__*/_react["default"].createElement(_IconButton2["default"], {
        "aria-label": "Detail panel visibility toggle",
        size: size,
        style: _objectSpread({
          transition: 'all ease 200ms',
          marginLeft: props.level * 9
        }, rotateIconStyle(data.tableData.isTreeExpanded)),
        onClick: function onClick(event) {
          props.onTreeExpandChanged(path, data);
          event.stopPropagation();
        }
      }, /*#__PURE__*/_react["default"].createElement(icons.DetailPanel, null)));
    } else {
      return /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
        padding: "none",
        key: 'key-tree-data-column'
      });
    }
  };
  var getStyle = function getStyle(index, level) {
    var style = {};
    if (typeof options.rowStyle === 'function') {
      style = _objectSpread(_objectSpread({}, style), options.rowStyle(data, index, level, props.hasAnyEditingRow));
    } else if (options.rowStyle) {
      style = _objectSpread(_objectSpread({}, style), options.rowStyle);
    }
    if (onRowClick || onRowDoubleClick) {
      style.cursor = 'pointer';
    }
    if (props.hasAnyEditingRow) {
      style.opacity = style.opacity ? style.opacity : 0.2;
    }
    return style;
  };
  var renderColumns = getRenderColumns();
  if (options.selection) {
    renderColumns.splice(0, 0, renderSelectionColumn());
  }
  var rowActions = CommonValues.rowActions(props);
  if (rowActions.length > 0) {
    if (options.actionsColumnIndex === -1) {
      renderColumns.push(renderActions(rowActions));
    } else if (options.actionsColumnIndex >= 0) {
      var endPos = 0;
      if (options.selection) {
        endPos = 1;
      }
      renderColumns.splice(options.actionsColumnIndex + endPos, 0, renderActions(rowActions));
    }
  }

  // Then we add detail panel icon
  if (props.detailPanel) {
    if (options.detailPanelColumnAlignment === 'right') {
      renderColumns.push(renderDetailPanelColumn());
    } else {
      renderColumns.splice(0, 0, renderDetailPanelColumn());
    }
  }

  // Lastly we add tree data icon
  if (props.isTreeData) {
    renderColumns.splice(0, 0, renderTreeDataColumn());
  }
  props.columns.filter(function (columnDef) {
    return columnDef.tableData.groupOrder > -1;
  }).forEach(function (columnDef) {
    renderColumns.splice(0, 0, /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
      size: size,
      padding: "none",
      key: 'key-group-cell' + columnDef.tableData.id
    }));
  });
  return /*#__PURE__*/_react["default"].createElement(_react["default"].Fragment, null, /*#__PURE__*/_react["default"].createElement(_TableRow2["default"], (0, _extends2["default"])({
    ref: forwardedRef,
    selected: hasAnyEditingRow
  }, rowProps, {
    onClick: function onClick(event) {
      if (persistEvents) {
        event.persist();
      }
      // Rows cannot be clicked while editing
      !hasAnyEditingRow && handleOnRowClick(event);
    },
    hover: !!(onRowClick || onRowDoubleClick),
    style: getStyle(rowProps.index || 0, props.level),
    "data-testid": "mtablebodyrow"
  }), renderColumns), /*#__PURE__*/_react["default"].createElement(_mTableDetailpanel.MTableDetailPanel, {
    options: options,
    data: data,
    detailPanel: props.detailPanel,
    renderColumns: renderColumns,
    size: size
  }), data.tableData.childRows && data.tableData.isTreeExpanded && data.tableData.childRows.map(function (data, index) {
    if (data.tableData.editing) {
      return /*#__PURE__*/_react["default"].createElement(props.components.EditRow, {
        columns: columns,
        components: props.components,
        data: data,
        icons: icons,
        localization: localization.editRow,
        getFieldValue: props.getFieldValue,
        key: index,
        mode: data.tableData.editing,
        isTreeData: props.isTreeData,
        detailPanel: props.detailPanel,
        onEditingCanceled: onEditingCanceled,
        onEditingApproved: onEditingApproved,
        errorState: props.errorState
      });
    } else {
      return /*#__PURE__*/_react["default"].createElement(props.components.Row, (0, _extends2["default"])({}, props, {
        data: data,
        index: index,
        key: index,
        level: props.level + 1,
        path: [].concat((0, _toConsumableArray2["default"])(path), [data.tableData.uuid]),
        onEditingCanceled: onEditingCanceled,
        onEditingApproved: onEditingApproved,
        hasAnyEditingRow: props.hasAnyEditingRow,
        treeDataMaxLevel: treeDataMaxLevel,
        errorState: props.errorState,
        cellEditable: cellEditable,
        onCellEditStarted: onCellEditStarted,
        onCellEditFinished: onCellEditFinished
      }));
    }
  }));
}
MTableBodyRow.propTypes = {
  forwardedRef: _propTypes["default"].element,
  actions: _propTypes["default"].array,
  index: _propTypes["default"].number.isRequired,
  data: _propTypes["default"].object.isRequired,
  detailPanel: _propTypes["default"].oneOfType([_propTypes["default"].func, _propTypes["default"].arrayOf(_propTypes["default"].oneOfType([_propTypes["default"].object, _propTypes["default"].func]))]),
  hasAnyEditingRow: _propTypes["default"].bool,
  onRowSelected: _propTypes["default"].func,
  path: _propTypes["default"].arrayOf(_propTypes["default"].oneOfType([_propTypes["default"].string, _propTypes["default"].number])),
  persistEvents: _propTypes["default"].bool,
  treeDataMaxLevel: _propTypes["default"].number,
  getFieldValue: _propTypes["default"].func.isRequired,
  columns: _propTypes["default"].array,
  onToggleDetailPanel: _propTypes["default"].func.isRequired,
  onRowClick: _propTypes["default"].func,
  onRowDoubleClick: _propTypes["default"].func,
  onEditingApproved: _propTypes["default"].func,
  onEditingCanceled: _propTypes["default"].func,
  errorState: _propTypes["default"].oneOfType([_propTypes["default"].object, _propTypes["default"].bool])
};
var _default = exports["default"] = /*#__PURE__*/_react["default"].forwardRef(function MTableBodyRowRef(props, ref) {
  return /*#__PURE__*/_react["default"].createElement(MTableBodyRow, (0, _extends2["default"])({}, props, {
    forwardedRef: ref
  }));
});