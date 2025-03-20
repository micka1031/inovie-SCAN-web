"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var _TableCell2 = _interopRequireDefault(require("@mui/material/TableCell"));
var _CircularProgress2 = _interopRequireDefault(require("@mui/material/CircularProgress"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));
var _react = _interopRequireWildcard(require("react"));
var _propTypes = _interopRequireDefault(require("prop-types"));
var _excluded = ["columnDef", "localization"];
/**
 *
 * THIS FILE IS NOT IN USE RIGHT NOW DUE TO REFACTORING ISSUES!
 *
 *
 *
 *
 * PLEASE SEE THE FOLLOWING FILE, AS IT IS THE PROD VERSION OF `MTableEditCell`:
 *
 *   https://github.com/material-table-core/core/blob/master/src/components/m-table-edit-cell.js
 *
 */
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function MTableEditCell(_ref) {
  var _ref$columnDef = _ref.columnDef,
    columnDef = _ref$columnDef === void 0 ? {} : _ref$columnDef,
    _ref$localization = _ref.localization,
    localization = _ref$localization === void 0 ? defaultProps.localization : _ref$localization,
    props = (0, _objectWithoutProperties2["default"])(_ref, _excluded);
  var _useState = (0, _react.useState)(function () {
      return {
        isLoading: false,
        value: props.rowData[columnDef.field]
      };
    }),
    _useState2 = (0, _slicedToArray2["default"])(_useState, 2),
    state = _useState2[0],
    setState = _useState2[1];
  (0, _react.useEffect)(function () {
    props.cellEditable.onCellEditApproved(state.value,
    // newValue
    props.rowData[columnDef.field],
    // oldValue
    props.rowData,
    // rowData with old value
    columnDef // columnDef
    ).then(function () {
      setState(_objectSpread(_objectSpread({}, state), {}, {
        isLoading: false
      }));
      props.onCellEditFinished(props.rowData, columnDef);
    })["catch"](function () {
      setState(_objectSpread(_objectSpread({}, state), {}, {
        isLoading: false
      }));
    });
  }, []);
  var getStyle = function getStyle() {
    var cellStyle = {
      boxShadow: '2px 0px 15px rgba(125,147,178,.25)',
      color: 'inherit',
      width: columnDef.tableData.width,
      boxSizing: 'border-box',
      fontSize: 'inherit',
      fontFamily: 'inherit',
      fontWeight: 'inherit',
      padding: '0 16px'
    };
    if (typeof columnDef.cellStyle === 'function') {
      cellStyle = _objectSpread(_objectSpread({}, cellStyle), columnDef.cellStyle(state.value, props.rowData));
    } else {
      cellStyle = _objectSpread(_objectSpread({}, cellStyle), columnDef.cellStyle);
    }
    if (typeof props.cellEditable.cellStyle === 'function') {
      cellStyle = _objectSpread(_objectSpread({}, cellStyle), props.cellEditable.cellStyle(state.value, props.rowData, columnDef));
    } else {
      cellStyle = _objectSpread(_objectSpread({}, cellStyle), props.cellEditable.cellStyle);
    }
    return cellStyle;
  };
  var handleKeyDown = function handleKeyDown(e) {
    if (e.keyCode === 13) {
      onApprove();
    } else if (e.keyCode === 27) {
      onCancel();
    }
  };
  var onApprove = function onApprove() {
    setState(_objectSpread(_objectSpread({}, state), {}, {
      isLoading: true
    }));
  };
  var onCancel = function onCancel() {
    props.onCellEditFinished(props.rowData, columnDef);
  };
  function renderActions() {
    if (state.isLoading) {
      return /*#__PURE__*/_react["default"].createElement("div", {
        style: {
          display: 'flex',
          justifyContent: 'center',
          width: 60
        }
      }, /*#__PURE__*/_react["default"].createElement(_CircularProgress2["default"], {
        size: 20
      }));
    }
    var actions = [{
      icon: props.icons.Check,
      tooltip: localization && localization.saveTooltip,
      onClick: onApprove,
      disabled: state.isLoading
    }, {
      icon: props.icons.Clear,
      tooltip: localization && localization.cancelTooltip,
      onClick: onCancel,
      disabled: state.isLoading
    }];
    return /*#__PURE__*/_react["default"].createElement(props.components.Actions, {
      actions: actions,
      components: props.components,
      size: "small"
    });
  }
  return /*#__PURE__*/_react["default"].createElement(_TableCell2["default"], {
    size: props.size,
    style: getStyle(),
    padding: "none",
    ref: props.forwardedRef
  }, /*#__PURE__*/_react["default"].createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/_react["default"].createElement("div", {
    style: {
      flex: 1,
      marginRight: 4
    }
  }, /*#__PURE__*/_react["default"].createElement(props.components.EditField, {
    columnDef: columnDef,
    value: state.value,
    onChange: function onChange(prevState, value) {
      return setState(_objectSpread(_objectSpread({}, prevState), {}, {
        value: value
      }));
    },
    onKeyDown: handleKeyDown,
    disabled: state.isLoading,
    rowData: props.rowData,
    autoFocus: true
  })), renderActions()));
}
var defaultProps = {
  localization: {
    saveTooltip: 'Save',
    cancelTooltip: 'Cancel'
  }
};
MTableEditCell.propTypes = {
  cellEditable: _propTypes["default"].object.isRequired,
  columnDef: _propTypes["default"].object.isRequired,
  components: _propTypes["default"].object.isRequired,
  errorState: _propTypes["default"].oneOfType([_propTypes["default"].object, _propTypes["default"].bool]),
  icons: _propTypes["default"].object.isRequired,
  localization: _propTypes["default"].object.isRequired,
  onCellEditFinished: _propTypes["default"].func.isRequired,
  rowData: _propTypes["default"].object.isRequired,
  size: _propTypes["default"].string,
  forwardedRef: _propTypes["default"].element
};
var _default = exports["default"] = /*#__PURE__*/_react["default"].forwardRef(function MTableEditCellRef(props, ref) {
  return /*#__PURE__*/_react["default"].createElement(MTableEditCell, (0, _extends2["default"])({}, props, {
    forwardedRef: ref
  }));
});