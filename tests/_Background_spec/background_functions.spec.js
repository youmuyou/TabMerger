/* 
TabMerger as the name implies merges your tabs into one location to save
memory usage and increase your productivity.

Copyright (C) 2021  Lior Bragilevsky

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

If you have any questions, comments, or concerns you can contact the
TabMerger team at <https://lbragile.github.io/TabMerger-Extension/contact/>
*/

import * as BackgroundFunc from "../../public/background/background_functions.js";
import * as BackgroundHelper from "../../public/background/background_helpers.js";

import { waitFor } from "@testing-library/react";

const anything = expect.any(Function);

beforeEach(() => {
  sessionStorage.setItem("settings", JSON.stringify(CONSTANTS.DEFAULT_SETTINGS));
});

describe("handleBrowserIconClick", () => {
  var findExtTabAndSwitchSpy, filterTabsSpy;

  beforeAll(() => {
    findExtTabAndSwitchSpy = jest.spyOn(BackgroundHelper, "findExtTabAndSwitch").mockResolvedValue(0);
    filterTabsSpy = jest.spyOn(BackgroundHelper, "filterTabs").mockResolvedValue(0);
  });

  afterAll(() => {
    findExtTabAndSwitchSpy.mockRestore();
    filterTabsSpy.mockRestore();
  });

  it.each([
    [false, "✅", "❌"],
    [true, "❌", "✅"],
  ])("settings.open = %s - calls findExtTabAndSwitch %s and filterTabs %s", async (open) => {
    sessionStorage.removeItem("settings");
    sessionStorage.setItem("settings", JSON.stringify({ open }));
    jest.clearAllMocks();

    BackgroundFunc.handleBrowserIconClick();

    await waitFor(() => {
      expect(chromeSyncGetSpy).toHaveBeenCalledTimes(1);
      expect(chromeSyncGetSpy).toHaveBeenCalledWith("settings", anything);

      expect(findExtTabAndSwitchSpy).toHaveBeenCalledTimes(1);
      expect(findExtTabAndSwitchSpy).not.toHaveBeenCalledWith(anything);

      if (open) {
        expect(filterTabsSpy).toHaveBeenCalledTimes(1);
        expect(filterTabsSpy).toHaveBeenCalledWith({ which: "all" }, { index: 0 });
      }
    });

    // cannot be inside await since this is a NOT statement
    if (!open) {
      expect(filterTabsSpy).not.toHaveBeenCalled();
    }

    expect.assertions(!open ? 5 : 5 + 6);
  });
});

describe("extensionMessage", () => {
  it("queries current tabs and filters them as needed", async () => {
    const request = { msg: "TabMerger is awesome!", id: 100 };
    const tab = { title: "TabMerger", url: "https://github.com/lbragile/TabMerger", id: 99 };

    var filterTabsSpy = jest.spyOn(BackgroundHelper, "filterTabs").mockResolvedValue(0);
    jest.clearAllMocks();

    BackgroundFunc.extensionMessage(request);

    expect(chromeTabsQuerySpy).toHaveBeenCalledTimes(1);
    expect(chromeTabsQuerySpy).toHaveBeenCalledWith({ currentWindow: true, active: true }, expect.any(Function));

    await waitFor(() => {
      expect(filterTabsSpy).toHaveBeenCalledTimes(1);
      expect(filterTabsSpy).toHaveBeenCalledWith({ which: request.msg }, tab, request.id);
    });

    expect.assertions(5);
    filterTabsSpy.mockRestore();
  });
});

describe("createContextMenu", () => {
  it("calls the chrome.contextMenus.create API with correct parameters", () => {
    jest.clearAllMocks();

    BackgroundFunc.createContextMenu(0, "TabMerger", "normal");

    expect(chromeContextMenusCeateSpy).toHaveBeenCalledTimes(1);
    expect(chromeContextMenusCeateSpy).toHaveBeenCalledWith({ id: 0, title: "TabMerger", type: "normal" });
  });
});

describe("contextMenuOrShortCut", () => {
  const tab = { index: 0 };
  var findExtTabAndSwitchSpy, filterTabsSpy, excludeSiteSpy;
  const inst_url = "https://lbragile.github.io/TabMerger-Extension/instructions";
  const contact_url = "https://lbragile.github.io/TabMerger-Extension/contact";

  beforeAll(() => {
    findExtTabAndSwitchSpy = jest.spyOn(BackgroundHelper, "findExtTabAndSwitch").mockImplementation(() => {});
    filterTabsSpy = jest.spyOn(BackgroundHelper, "filterTabs").mockImplementation(() => {});
    excludeSiteSpy = jest.spyOn(BackgroundHelper, "excludeSite").mockImplementation(() => {});
    chromeTabsCreateSpy = jest.spyOn(chrome.tabs, "create").mockImplementation(() => {});
  });

  afterAll(() => {
    findExtTabAndSwitchSpy.mockRestore();
    filterTabsSpy.mockRestore();
    excludeSiteSpy.mockRestore();
    chromeTabsCreateSpy.mockRestore();
  });

  test.each([
    ["aopen-tabmerger", ""],
    ["merge-left-menu", "left"],
    ["merge-right-menu", "right"],
    ["merge-xcluding-menu", "excluding"],
    ["merge-snly-menu", "only"],
    ["remove-visibility", ""],
    ["zdl-instructions", ""],
    ["dl-contact", ""],
    ["merge-all-menu", "all"],
  ])("%s", async (menuItemId, which) => {
    jest.clearAllMocks();

    BackgroundFunc.contextMenuOrShortCut({ menuItemId }, tab);

    if (menuItemId === "aopen-tabmerger") {
      await waitFor(() => {
        expect(findExtTabAndSwitchSpy).toHaveBeenCalledTimes(1);
        expect(findExtTabAndSwitchSpy).not.toHaveBeenCalledWith(anything);
      });

      // switch statement can be empty (without break) which would cause it to go
      // to next item. This has to be outside of await as it is a NOT called statement
      expect(filterTabsSpy).not.toHaveBeenCalled();

      expect.assertions(3);
    } else if (menuItemId.includes("merge")) {
      await waitFor(() => {
        expect(findExtTabAndSwitchSpy).toHaveBeenCalledTimes(1);
        expect(findExtTabAndSwitchSpy).not.toHaveBeenCalledWith(anything);
        expect(filterTabsSpy).toHaveBeenCalledTimes(1);
        expect(filterTabsSpy).toHaveBeenCalledWith({ which, menuItemId }, tab);
      });
      expect.assertions(7);
    } else if (menuItemId === "remove-visibility") {
      expect(excludeSiteSpy).toHaveBeenCalledTimes(1);
      expect(excludeSiteSpy).toHaveBeenCalledWith(tab);
      expect.assertions(2);
    } else if (menuItemId.includes("dl-")) {
      expect(chromeTabsCreateSpy).toHaveBeenCalledTimes(1);
      expect(chromeTabsCreateSpy).toHaveBeenCalledWith({ active: true, url: menuItemId.includes("instructions") ? inst_url : contact_url }); // prettier-ignore
      expect.assertions(2);
    }
  });

  test("typeof info === string", async () => {
    const command = "merge-left-menu";
    jest.clearAllMocks();

    BackgroundFunc.contextMenuOrShortCut(command, tab);

    await waitFor(() => {
      expect(filterTabsSpy).toHaveBeenCalledTimes(1);
      expect(filterTabsSpy).toHaveBeenCalledWith({ which: "left", command }, tab);
    });

    expect.hasAssertions();
  });
});

describe("translate", () => {
  it("returns a translation if avaiable", () => {
    expect(BackgroundFunc.translate("Title")).toEqual("титул");
  });

  it("returns original msg if translation is not available", () => {
    expect(BackgroundFunc.translate("random")).toEqual("random");
  });
});
