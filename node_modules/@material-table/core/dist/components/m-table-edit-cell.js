"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _react = _interopRequireDefault(require("react"));
var _propTypes = _interopRequireDefault(require("prop-types"));
var _TableCell = _interopRequireDefault(require("@mui/material/TableCell"));
var _CircularProgress = _interopRequireDefault(require("@mui/material/CircularProgress"));
var _validate = require("../utils/validate");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _callSuper(t, o, e) { return o = (0, _getPrototypeOf2["default"])(o), (0, _possibleConstructorReturn2["default"])(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], (0, _getPrototypeOf2["default"])(t).constructor) : o.apply(t, e)); }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
var MTableEditCell = /*#__PURE__*/function (_React$Component) {
  function MTableEditCell(props) {
    var _this;
    (0, _classCallCheck2["default"])(this, MTableEditCell);
    _this = _callSuper(this, MTableEditCell, [props]);
    (0, _defineProperty2["default"])(_this, "getStyle", function () {
      var cellStyle = {
        boxShadow: '2px 0px 15px rgba(125,147,178,.25)',
        color: 'inherit',
        width: _this.props.columnDef.tableData.width,
        boxSizing: 'border-box',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        fontWeight: 'inherit',
        padding: '0 16px'
      };
      if (typeof _this.props.columnDef.cellStyle === 'function') {
        cellStyle = _objectSpread(_objectSpread({}, cellStyle), _this.props.columnDef.cellStyle(_this.state.value, _this.props.rowData));
      } else {
        cellStyle = _objectSpread(_objectSpread({}, cellStyle), _this.props.columnDef.cellStyle);
      }
      if (typeof _this.props.cellEditable.cellStyle === 'function') {
        cellStyle = _objectSpread(_objectSpread({}, cellStyle), _this.props.cellEditable.cellStyle(_this.state.value, _this.props.rowData, _this.props.columnDef));
      } else {
        cellStyle = _objectSpread(_objectSpread({}, cellStyle), _this.props.cellEditable.cellStyle);
      }
      return cellStyle;
    });
    (0, _defineProperty2["default"])(_this, "handleKeyDown", function (e) {
      if (e.keyCode === 13) {
        _this.onApprove();
      } else if (e.keyCode === 27) {
        _this.onCancel();
      }
    });
    (0, _defineProperty2["default"])(_this, "onApprove", function () {
      var isValid = (0, _validate.validateInput)(_this.props.columnDef, _this.state.value).isValid;
      if (!isValid) {
        return;
      }
      _this.setState({
        isLoading: true
      }, function () {
        _this.props.cellEditable.onCellEditApproved(_this.state.value,
        // newValue
        _this.props.getFieldValue(_this.props.rowData, _this.props.columnDef),
        // oldValue
        _this.props.rowData,
        // rowData with old value
        _this.props.columnDef // columnDef
        ).then(function () {
          _this.setState({
            isLoading: false
          });
          _this.props.onCellEditFinished(_this.props.rowData, _this.props.columnDef);
        })["catch"](function (error) {
          if (process.env.NODE_ENV === 'development') console.log(error);
          _this.setState({
            isLoading: false
          });
        });
      });
    });
    (0, _defineProperty2["default"])(_this, "onCancel", function () {
      _this.props.onCellEditFinished(_this.props.rowData, _this.props.columnDef);
    });
    _this.state = {
      errorState: {
        isValid: true,
        helperText: ''
      },
      isLoading: false,
      value: props.getFieldValue(_this.props.rowData, _this.props.columnDef, false)
    };
    return _this;
  }
  (0, _inherits2["default"])(MTableEditCell, _React$Component);
  return (0, _createClass2["default"])(MTableEditCell, [{
    key: "renderActions",
    value: function renderActions() {
      if (this.state.isLoading) {
        return /*#__PURE__*/_react["default"].createElement("div", {
          style: {
            display: 'flex',
            justifyContent: 'center',
            width: 60
          }
        }, /*#__PURE__*/_react["default"].createElement(_CircularProgress["default"], {
          size: 20
        }));
      }
      var actions = [{
        icon: this.props.icons.Check,
        tooltip: this.props.localization.saveTooltip,
        onClick: this.onApprove,
        disabled: this.state.isLoading || !this.state.errorState.isValid
      }, {
        icon: this.props.icons.Clear,
        tooltip: this.props.localization.cancelTooltip,
        onClick: this.onCancel,
        disabled: this.state.isLoading
      }];
      return /*#__PURE__*/_react["default"].createElement(this.props.components.Actions, {
        actions: actions,
        components: this.props.components,
        size: "small"
      });
    }
  }, {
    key: "handleChange",
    value: function handleChange(value) {
      var errorState = (0, _validate.validateInput)(this.props.columnDef, value);
      this.setState({
        errorState: errorState,
        value: value
      });
    }
  }, {
    key: "render",
    value: function render() {
      var _this2 = this;
      return /*#__PURE__*/_react["default"].createElement(_TableCell["default"], {
        size: this.props.size,
        style: this.getStyle(),
        padding: "none"
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
      }, /*#__PURE__*/_react["default"].createElement(this.props.components.EditField, {
        columnDef: this.props.columnDef,
        value: this.state.value,
        error: !this.state.errorState.isValid,
        helperText: this.state.errorState.helperText,
        onChange: function onChange(value) {
          return _this2.handleChange(value);
        },
        onKeyDown: this.handleKeyDown,
        disabled: this.state.isLoading,
        rowData: this.props.rowData,
        autoFocus: true
      })), this.renderActions()));
    }
  }]);
}(_react["default"].Component);
MTableEditCell.defaultProps = {
  columnDef: {},
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
  getFieldValue: _propTypes["default"].func.isRequired
};
var _default = exports["default"] = MTableEditCell;