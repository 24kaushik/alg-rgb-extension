import GObject from "gi://GObject";
import St from "gi://St";
import Gio from "gi://Gio";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Slider from "resource:///org/gnome/shell/ui/slider.js";

// Constants
const EXTENSION_NAME = "ALG RGB";
const LOG_PREFIX = "[ALG RGB]";
const DEFAULT_COLOR = "white";
const DEFAULT_BRIGHTNESS = 4;
const MAX_BRIGHTNESS = 4;
const COLORS_PER_ROW = 4;

const COLORS = [
  { name: "red", css: "#ff3b30" },
  { name: "orange", css: "#ff9500" },
  { name: "yellow", css: "#ffd60a" },
  { name: "lime", css: "#b8ff2c" },
  { name: "light-green", css: "#66ff66" },
  { name: "green", css: "#00c853" },
  { name: "green-cyan", css: "#00d4a8" },
  { name: "cyan", css: "#00c8ff" },
  { name: "light-blue", css: "#4da6ff" },
  { name: "blue", css: "#2962ff" },
  { name: "violet", css: "#7c4dff" },
  { name: "magenta", css: "#d500f9" },
  { name: "pink", css: "#ff4081" },
  { name: "flesh", css: "#ffb38a" },
  { name: "bluish-white", css: "#b8e6ff" },
  { name: "white", css: "#ffffff" },
];

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _(EXTENSION_NAME));

      this._currentColor = DEFAULT_COLOR;
      this._brightness = DEFAULT_BRIGHTNESS;
      this._colorButtons = [];

      console.log(`${LOG_PREFIX} Creating indicator`);

      this._setupPanelIcon();
      this._setupMenuTitle();
      this._setupColorGrid();
      this._setupBrightnessControl();
      this._setupOffButton();
    }

    /**
     * Sets up the panel icon
     */
    _setupPanelIcon() {
      this.add_child(
        new St.Icon({
          icon_name: "input-keyboard-symbolic",
          style_class: "system-status-icon",
        }),
      );
    }

    /**
     * Sets up the menu title and initial separator
     */
    _setupMenuTitle() {
      const title = new PopupMenu.PopupMenuItem(_("Keyboard RGB"));
      title.setSensitive(false);
      this.menu.addMenuItem(title);
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }

    /**
     * Creates and sets up the color grid
     */
    _setupColorGrid() {
      const colorItem = new PopupMenu.PopupBaseMenuItem({
        reactive: false,
        can_focus: false,
      });

      const container = new St.BoxLayout({
        vertical: true,
        x_expand: true,
        style_class: "color-grid",
      });

      let currentRow = null;

      COLORS.forEach((color, index) => {
        // Create a new row when needed
        if (index % COLORS_PER_ROW === 0) {
          currentRow = new St.BoxLayout({
            x_expand: true,
            style_class: "color-row",
          });
          container.add_child(currentRow);
        }

        const button = this._createColorButton(color);
        this._colorButtons.push(button);
        currentRow.add_child(button);
      });

      colorItem.add_child(container);
      this.menu.addMenuItem(colorItem);
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }

    /**
     * Creates a color button with the specified color
     * @param {Object} color - Color object with name and css hex value
     * @returns {St.Button} The created color button
     */
    _createColorButton(color) {
      const button = new St.Button({
        style_class: "color-button",
        reactive: true,
        can_focus: true,
        track_hover: true,
      });

      button._colorName = color.name;
      button.set_style(`background-color: ${color.css};`);
      button.accessible_name = color.name;

      // Highlight the default color
      if (color.name === this._currentColor) {
        button.add_style_class_name("selected");
      }

      button.connect("clicked", () => {
        this._selectColor(color.name);
        this._executeCommand(color.name, this._brightness);
      });

      return button;
    }

    /**
     * Sets up the brightness control slider and label
     */
    _setupBrightnessControl() {
      this._brightnessLabel = new St.Label({
        text: this._getBrightnessLabelText(),
      });

      const labelItem = new PopupMenu.PopupBaseMenuItem({
        reactive: false,
        can_focus: false,
      });
      labelItem.add_child(this._brightnessLabel);
      this.menu.addMenuItem(labelItem);

      const sliderItem = new PopupMenu.PopupBaseMenuItem({
        reactive: false,
        can_focus: false,
      });

      this._slider = new Slider.Slider(1.0);
      sliderItem.add_child(this._slider);
      this.menu.addMenuItem(sliderItem);

      this._slider.connect("notify::value", () => {
        this._onSliderChanged();
      });
    }

    /**
     * Handles slider value changes
     */
    _onSliderChanged() {
      const newBrightness = Math.round(this._slider.value * MAX_BRIGHTNESS);

      if (newBrightness === this._brightness) {
        return;
      }

      this._brightness = newBrightness;
      this._brightnessLabel.text = this._getBrightnessLabelText();
      this._executeCommand(this._currentColor, this._brightness);
    }

    /**
     * Gets the formatted brightness label text
     * @returns {string} Brightness label text
     */
    _getBrightnessLabelText() {
      return `Brightness (${this._brightness})`;
    }

    /**
     * Sets up the "Turn Off" button
     */
    _setupOffButton() {
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      const offItem = new PopupMenu.PopupMenuItem(_("Turn Off"));
      offItem.connect("activate", () => {
        this._currentColor = "off";
        this._executeCommand("off", null);
      });

      this.menu.addMenuItem(offItem);
    }

    /**
     * Updates the UI to reflect the selected color
     * @param {string} colorName - The name of the selected color
     */
    _selectColor(colorName) {
      this._colorButtons.forEach((button) => {
        if (button._colorName === colorName) {
          button.add_style_class_name("selected");
        } else {
          button.remove_style_class_name("selected");
        }
      });

      this._currentColor = colorName;
    }

    /**
     * Executes the alg-rgb command
     * @param {string} color - Color name or "off"
     * @param {number|null} brightness - Brightness level (0-4) or null
     */
    _executeCommand(color, brightness) {
      const args =
        brightness !== null
          ? ["alg-rgb", color, brightness.toString()]
          : ["alg-rgb", color];

      try {
        const proc = Gio.Subprocess.new(args, Gio.SubprocessFlags.NONE);

        proc.wait_check_async(null, (proc, res) => {
          try {
            proc.wait_check_finish(res);
          } catch (e) {
            console.error(`${LOG_PREFIX} Command failed: ${e.message}`);
          }
        });
      } catch (e) {
        console.error(`${LOG_PREFIX} Failed to launch command: ${e.message}`);
      }
    }
  },
);

export default class AlgRgbExtension extends Extension {
  enable() {
    console.log(`${LOG_PREFIX} Enabled`);

    this._indicator = new Indicator();
    Main.panel.addToStatusArea(this.uuid, this._indicator);
  }

  disable() {
    console.log(`${LOG_PREFIX} Disabled`);

    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  }
}
