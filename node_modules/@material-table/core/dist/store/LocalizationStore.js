"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useLocalizationStore = exports.useIconStore = void 0;
exports.useMergeProps = useMergeProps;
exports.useOptionStore = void 0;
exports.withContext = withContext;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _zustand = require("zustand");
var _react = _interopRequireDefault(require("react"));
var _deepEql = _interopRequireDefault(require("deep-eql"));
var _props = _interopRequireDefault(require("../defaults/props.localization"));
var _props2 = _interopRequireDefault(require("../defaults/props.options"));
var _props3 = _interopRequireDefault(require("../defaults/props.icons"));
var _props4 = _interopRequireDefault(require("../defaults/props.components"));
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
var merge = require('deepmerge');
var ZustandContext = /*#__PURE__*/_react["default"].createContext();
var createStore = function createStore(props) {
  return (0, _zustand.create)(function (set) {
    var _props$localization;
    return {
      // Localization
      localization: merge(_props["default"], (_props$localization = props.localization) !== null && _props$localization !== void 0 ? _props$localization : {}),
      mergeLocalization: function mergeLocalization(nextLocalization) {
        set(function (_ref) {
          var localization = _ref.localization;
          var mergedLocalization = merge(localization, nextLocalization !== null && nextLocalization !== void 0 ? nextLocalization : {});
          mergedLocalization.body.editRow.dateTimePickerLocalization = mergedLocalization.dateTimePickerLocalization;
          mergedLocalization.body.filterRow.dateTimePickerLocalization = mergedLocalization.dateTimePickerLocalization;
          if (!(0, _deepEql["default"])(mergedLocalization, nextLocalization)) {
            return {
              localization: mergedLocalization
            };
          } else {
            return {
              localization: localization
            };
          }
        });
      },
      // Options
      options: _objectSpread(_objectSpread({}, _props2["default"]), props.options),
      mergeOptions: function mergeOptions(nextOptions) {
        set(function () {
          var mergedOptions = _objectSpread(_objectSpread({}, _props2["default"]), nextOptions);
          if (!(0, _deepEql["default"])(mergedOptions, nextOptions)) {
            return {
              options: mergedOptions
            };
          } else {
            return {
              options: _props2["default"]
            };
          }
        });
      },
      //  Icons
      icons: _props3["default"],
      mergeIcons: function mergeIcons(nextIcons) {
        set({
          icons: _objectSpread(_objectSpread({}, _props3["default"]), nextIcons)
        });
      },
      // Components
      components: _props4["default"],
      mergeComponents: function mergeComponents(nextComponents) {
        set(function (_ref2) {
          var components = _ref2.components;
          return {
            components: _objectSpread(_objectSpread({}, components), nextComponents)
          };
        });
      }
    };
  });
};
var useLocalizationStore = exports.useLocalizationStore = function useLocalizationStore() {
  var store = _react["default"].useContext(ZustandContext);
  var localization = (0, _zustand.useStore)(store, function (state) {
    return state.localization;
  });
  return localization;
};
var useOptionStore = exports.useOptionStore = function useOptionStore() {
  var store = _react["default"].useContext(ZustandContext);
  var options = (0, _zustand.useStore)(store, function (state) {
    return state.options;
  });
  return options;
};
var useIconStore = exports.useIconStore = function useIconStore() {
  var store = _react["default"].useContext(ZustandContext);
  var icons = (0, _zustand.useStore)(store, function (state) {
    return state.icons;
  });
  return icons;
};
function useMergeProps(props) {
  var store = _react["default"].useContext(ZustandContext);
  var _useStore = (0, _zustand.useStore)(store, function (state) {
      return state;
    }),
    mergeLocalization = _useStore.mergeLocalization,
    mergeOptions = _useStore.mergeOptions,
    mergeIcons = _useStore.mergeIcons,
    mergeComponents = _useStore.mergeComponents,
    localization = _useStore.localization,
    options = _useStore.options,
    icons = _useStore.icons,
    components = _useStore.components;
  _react["default"].useEffect(function () {
    if (props.localization) {
      mergeLocalization(props.localization);
    }
  }, [props.localization]);
  _react["default"].useEffect(function () {
    if (props.options) {
      mergeOptions(props.options);
    }
  }, [props.options]);
  _react["default"].useEffect(function () {
    if (props.icons) {
      mergeIcons(props.icons);
    }
  }, [props.icons]);
  _react["default"].useEffect(function () {
    if (props.components) {
      mergeComponents(props.components);
    }
  }, [props.components]);
  return {
    localization: localization,
    options: options,
    icons: icons,
    components: components
  };
}
function withContext(WrappedComponent) {
  return function Wrapped(props) {
    var store = _react["default"].useRef(createStore(props)).current;
    return /*#__PURE__*/_react["default"].createElement(ZustandContext.Provider, {
      value: store
    }, /*#__PURE__*/_react["default"].createElement(WrappedComponent, props));
  };
}