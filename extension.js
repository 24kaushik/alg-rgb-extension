import GObject from "gi://GObject";
import St from "gi://St";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("ALG RGB"));

      console.log("[ALG RGB] Creating indicator");

      this.add_child(
        new St.Icon({
          icon_name: "input-keyboard-symbolic",
          style_class: "system-status-icon",
        }),
      );

      const title = new PopupMenu.PopupMenuItem(_("Keyboard RGB"));
      title.setSensitive(false);
      this.menu.addMenuItem(title);

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

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

      // A menu item that will contain our custom layout
      const colorItem = new PopupMenu.PopupBaseMenuItem({
        reactive: false,
        can_focus: false,
      });

      // Vertical container
      const container = new St.BoxLayout({
        vertical: true,
        x_expand: true,
        style_class: "color-grid",
      });

      const COLUMNS = 4;

      let row = null;

      COLORS.forEach((color, index) => {
        if (index % COLUMNS === 0) {
          row = new St.BoxLayout({
            x_expand: true,
            style_class: "color-row",
          });

          container.add_child(row);
        }

        const button = new St.Button({
          style_class: "color-button",
          reactive: true,
          can_focus: true,
          track_hover: true,
        });

        button.set_style(`
        background-color: ${color.css};
        `);

        button.accessible_name = color.name;

        button.connect("clicked", () => {
          console.log(`[ALG RGB] ${color.name}`);

          // TODO:
          // alg-rgb ${color.name}
        });

        row.add_child(button);
      });

      colorItem.add_child(container);

      this.menu.addMenuItem(colorItem);
    }
  },
);

export default class AlgRgbExtension extends Extension {
  enable() {
    console.log("[ALG RGB] Enabled");

    this._indicator = new Indicator();

    Main.panel.addToStatusArea(this.uuid, this._indicator);
  }

  disable() {
    console.log("[ALG RGB] Disabled");

    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  }
}
