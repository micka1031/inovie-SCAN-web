"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
var _Box2 = _interopRequireDefault(require("@mui/material/Box"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _Toolbar = _interopRequireDefault(require("@mui/material/Toolbar"));
var _Chip = _interopRequireDefault(require("@mui/material/Chip"));
var _Typography = _interopRequireDefault(require("@mui/material/Typography"));
var _propTypes = _interopRequireDefault(require("prop-types"));
var _react = _interopRequireWildcard(require("react"));
var _dnd = require("@hello-pangea/dnd");
var _store = require("../../store");
var _LocalizationStore = require("../../store/LocalizationStore");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; } /* eslint-disable no-unused-vars */
/* eslint-enable no-unused-vars */

function MTableGroupbar(props) {
  var localization = (0, _store.useLocalizationStore)().grouping;
  var icons = (0, _store.useIconStore)();
  var options = (0, _LocalizationStore.useOptionStore)();
  var getItemStyle = function getItemStyle(isDragging, draggableStyle) {
    return _objectSpread({
      // some basic styles to make the items look a bit nicer
      userSelect: 'none',
      // padding: '8px 16px',
      margin: "0 ".concat(8, "px 0 0")
    }, draggableStyle);
  };
  var getListStyle = function getListStyle(isDraggingOver) {
    return {
      // background: isDraggingOver ? 'lightblue' : '#0000000a',
      background: '#0000000a',
      display: 'flex',
      width: '100%',
      padding: 1,
      overflow: 'auto',
      border: '1px solid #ccc',
      borderStyle: 'dashed'
    };
  };
  (0, _react.useEffect)(function () {
    if (props.persistentGroupingsId) {
      var persistentGroupings = props.groupColumns.map(function (column) {
        return {
          field: column.field,
          groupOrder: column.tableData.groupOrder,
          groupSort: column.tableData.groupSort,
          columnOrder: column.tableData.columnOrder
        };
      });
      var materialTableGroupings = localStorage.getItem('material-table-groupings');
      if (materialTableGroupings) {
        materialTableGroupings = JSON.parse(materialTableGroupings);
      } else {
        materialTableGroupings = {};
      }
      if (persistentGroupings.length === 0) {
        delete materialTableGroupings[props.persistentGroupingsId];
        if (Object.keys(materialTableGroupings).length === 0) {
          localStorage.removeItem('material-table-groupings');
        } else {
          localStorage.setItem('material-table-groupings', JSON.stringify(materialTableGroupings));
        }
      } else {
        materialTableGroupings[props.persistentGroupingsId] = persistentGroupings;
        localStorage.setItem('material-table-groupings', JSON.stringify(materialTableGroupings));
      }
    }
    props.onGroupChange && props.onGroupChange(props.groupColumns);
  }, [props.groupColumns]);
  return /*#__PURE__*/_react["default"].createElement(_Toolbar["default"], {
    className: props.className,
    disableGutters: true,
    ref: props.forwardedRef
  }, /*#__PURE__*/_react["default"].createElement(_dnd.Droppable, {
    droppableId: "groups",
    direction: "horizontal",
    placeholder: "Deneme"
  }, function (provided, snapshot) {
    return /*#__PURE__*/_react["default"].createElement(_Box2["default"], {
      ref: provided.innerRef,
      sx: getListStyle(snapshot.isDraggingOver)
    }, props.groupColumns.length > 0 && /*#__PURE__*/_react["default"].createElement(_Typography["default"], {
      variant: "caption",
      sx: {
        padding: 1
      }
    }, localization.groupedBy), props.groupColumns.map(function (columnDef, index) {
      return /*#__PURE__*/_react["default"].createElement(_dnd.Draggable, {
        key: columnDef.tableData.id.toString(),
        draggableId: columnDef.tableData.id.toString(),
        index: index
      }, function (provided, snapshot) {
        var _options$groupChipPro;
        return /*#__PURE__*/_react["default"].createElement(_Box2["default"], (0, _extends2["default"])({
          ref: provided.innerRef
        }, provided.draggableProps, provided.dragHandleProps, {
          sx: getItemStyle(snapshot.isDragging, provided.draggableProps.style)
        }), /*#__PURE__*/_react["default"].createElement(_Chip["default"], (0, _extends2["default"])({}, provided.dragHandleProps, options.groupChipProps, {
          onClick: function onClick() {
            return props.onSortChanged(columnDef);
          },
          label: /*#__PURE__*/_react["default"].createElement(_Box2["default"], {
            sx: {
              display: 'flex',
              alignItems: 'center'
            }
          }, /*#__PURE__*/_react["default"].createElement(_Box2["default"], {
            sx: {
              "float": 'left'
            }
          }, columnDef.title), columnDef.tableData.groupSort && /*#__PURE__*/_react["default"].createElement(icons.SortArrow, {
            sx: {
              transition: '300ms ease all',
              transform: columnDef.tableData.groupSort === 'asc' ? 'rotate(-180deg)' : 'none',
              fontSize: 18
            }
          })),
          sx: _objectSpread({
            boxShadow: 'none',
            textTransform: 'none'
          }, (_options$groupChipPro = options.groupChipProps) !== null && _options$groupChipPro !== void 0 ? _options$groupChipPro : {}),
          onDelete: function onDelete() {
            return props.onGroupRemoved(columnDef, index);
          }
        })));
      });
    }), props.groupColumns.length === 0 && /*#__PURE__*/_react["default"].createElement(_Typography["default"], {
      variant: "caption",
      sx: {
        padding: 1
      }
    }, localization.placeholder), provided.placeholder);
  }));
}
MTableGroupbar.propTypes = {
  forwardedRef: _propTypes["default"].element,
  className: _propTypes["default"].string,
  onSortChanged: _propTypes["default"].func,
  onGroupRemoved: _propTypes["default"].func,
  onGroupChange: _propTypes["default"].func,
  persistentGroupingsId: _propTypes["default"].string
};
var _default = exports["default"] = /*#__PURE__*/_react["default"].forwardRef(function MTableGroupbarRef(props, ref) {
  return /*#__PURE__*/_react["default"].createElement(MTableGroupbar, (0, _extends2["default"])({}, props, {
    forwardedRef: ref
  }));
});