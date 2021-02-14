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

import * as AppHelper from "../App/App_helpers";
import { TUTORIAL_GROUP } from "../Extra/Tutorial";

import Tab from "../Tab/Tab.js";
import Group from "../Group/Group.js";

/**
 * @module App/App_functions
 */

/**
 * Initialize the local & sync storage when the user first installs TabMerger.
 * @param {{blacklist: string, color: string, dark: boolean,
 *  open: "with" | "without", restore: "keep" | "remove", title: string}} default_settings TabMerger's original default settings
 * @param {{color: string, created: string, tabs: object[], title: string}} default_group TabMerger's original default group (with up-to-date timestamp)
 * @param {HTMLElement} sync_node Node indicating the "Last Sync" time
 * @param {Function} setTour For re-rendering the tutorial walkthrough
 * @param {Function} setGroups For re-rendering the initial groups
 * @param {Function} setTabTotal For re-rendering the total tab counter
 *
 * @see defaultSettings in App.js
 * @see defaultGroup in App.js
 */
export function storageInit(default_settings, default_group, sync_node, setTour, setGroups, setTabTotal) {
  const scroll = document.documentElement.scrollTop;
  chrome.storage.sync.get(null, (sync) => {
    if (!sync.settings) {
      chrome.storage.sync.set({ settings: default_settings }, () => {});
      AppHelper.toggleDarkMode(true);
    } else {
      AppHelper.toggleDarkMode(sync.settings.dark);
    }

    if (sync["group-0"]) {
      AppHelper.toggleSyncTimestamp(true, sync_node);
    }

    delete sync.settings;
    chrome.storage.local.get(["groups", "tour_needed"], (local) => {
      const tour_needed = !local.tour_needed && !local.groups;
      const groups = tour_needed ? TUTORIAL_GROUP : local.groups || { "group-0": default_group };

      chrome.storage.local.remove(["groups"], () => {
        chrome.storage.local.set({ groups, groups_copy: [], scroll, tour_needed }, () => {
          setTour(tour_needed);
          setGroups(JSON.stringify(groups));
          setTabTotal(AppHelper.updateTabTotal(groups));
        });
      });
    });
  });
}

/**
 * Allows the user to view the tutorial again or navigate to the official homepage.
 * Choosing OK plays the tutorial, choosing Cancel navigates to the official homepage.
 * If a tutorial is replayed, the current configuration is not changed to avoid data loss!
 *
 * @param {HTMLElement} e The help button which was clicked
 * @param {string} url Link to TabMerger's official homepage
 * @param {Function} setTour For re-rendering the tour
 * @param {Function} setDialog For rendering a confirmation message
 */
export function resetTutorialChoice(e, url, setTour, setDialog) {
  var element = e.target.closest("#need-btn");
  AppHelper.elementMutationListener(element, (mutation) => {
    if (mutation.type === "attributes") {
      element.getAttribute("response") === "positive" ? setTour(true) : window.open(url, "_blank", "noreferrer");
    }
  });

  setDialog({
    element,
    show: true,
    title: "❔ TabMerger Question ❔",
    msg: (
      <div>
        Press <b>VIEW TUTORIAL</b> to get a walkthrough of TabMerger's main features{" "}
        <u>
          <i>OR</i>
        </u>{" "}
        <b>GO TO SITE</b> to visit TabMerger's official homepage!
      </div>
    ),
    accept_btn_text: "VIEW TUTORIAL",
    reject_btn_text: "GO TO SITE",
  });
}

/**
 * Displays the tab & group information in the badge icon. Also adjusts the background color and text as needed.
 *
 * @param {number} tabTotal The current total tab count
 * @param {number?} STEP_SIZE Break point for color changes (number of tabs before color changes)
 * @param {{"green": string, "yellow": string, "orange": string, "red": string }?} COLORS The colors as hex strings of form "#FF7700"
 */
// prettier-ignore
export function badgeIconInfo(tabTotal, STEP_SIZE = 25, COLORS = { green: "#060", yellow: "#CC0", orange: "#C70", red: "#C00" }) { 
  chrome.storage.sync.get("settings", (sync) => {
    chrome.storage.local.get("groups", (local) => {
      if (local.groups) {
        const num_groups = Object.keys(local.groups).length;
        var color;
        if (tabTotal < STEP_SIZE) {
          color = COLORS.green;
        } else if (tabTotal < STEP_SIZE * 2) {
          color = COLORS.yellow;
        } else if (tabTotal < STEP_SIZE * 3) {
          color = COLORS.orange;
        } else {
          color = COLORS.red;
        }

        const showInfo = sync.settings.badgeInfo === "display";
        const text = showInfo && tabTotal > 0 ? `${tabTotal}|${num_groups}` : "";
        const tab_translate = translate(tabTotal === 1 ? "tab" : "tabs").toLocaleLowerCase();
        const group_translate = translate(num_groups === 1 ? "group" : "groups").toLocaleLowerCase();
        const title = tabTotal > 0 ? `You currently have ${tabTotal} ${tab_translate} in ${num_groups} ${group_translate}` : "Merge your tabs into groups";

        chrome.browserAction.setBadgeText({ text }, () => {});
        chrome.browserAction.setBadgeBackgroundColor({ color }, () => {});
        chrome.browserAction.setTitle({ title }, () => {});
      }
    });
  });
}

/**
 * Updates the sync items - only those that have changes are overwritten
 * @param {HTMLElement} sync_node Node corresponding to the "Last Sync:" timestamp
 *
 * @see defaultGroup in App.js
 */
export function syncWrite(sync_node) {
  chrome.storage.local.get("groups", async (local) => {
    var current_groups = local.groups;
    if (current_groups && (current_groups["group-0"].tabs.length > 0 || Object.keys(current_groups).length > 1)) {
      for (var key of Object.keys(current_groups)) {
        await AppHelper.updateGroupItem(key, current_groups[key]);
      }

      // remove extras from previous sync
      chrome.storage.sync.get(null, (sync) => {
        delete sync.settings;
        var remove_keys = Object.keys(sync).filter((key) => !Object.keys(current_groups).includes(key));
        chrome.storage.sync.remove(remove_keys, () => {
          AppHelper.toggleSyncTimestamp(true, sync_node);
        });
      });
    }
  });
}

/**
 * Provides the ability to upload group items from Sync storage.
 * This action overwrites local storage accordingly.
 * @example
 * 1. "TabMerger <= uploaded # groups ➡ overwrite current"
 * 2. "TabMerger > uploaded # groups ➡ overwrite current & delete extra groups"
 * @param {HTMLElement} sync_node Node corresponding to the "Last Sync:" timestamp
 * @param {Function} setGroups For re-rendering the groups
 * @param {Function} setTabTotal For re-rendering the total tab count
 */
export function syncRead(sync_node, setGroups, setTabTotal) {
  chrome.storage.sync.get(null, (sync) => {
    if (sync["group-0"]) {
      delete sync.settings;
      chrome.storage.local.remove(["groups"], () => {
        var new_ls = {};
        var remove_keys = [];
        Object.keys(sync).forEach((key) => {
          new_ls[key] = sync[key];
          remove_keys.push(key);
        });

        chrome.storage.local.set({ groups: new_ls, scroll: document.documentElement.scrollTop }, () => {
          chrome.storage.sync.remove(remove_keys, () => {
            AppHelper.toggleSyncTimestamp(false, sync_node);
            setGroups(JSON.stringify(new_ls));
            setTabTotal(AppHelper.updateTabTotal(new_ls));
          });
        });
      });
    }
  });
}

/**
 * When a restoring action is performed, the corresponding tab(s) need to be opened.
 * However, if the settings indicate to "Remove from TabMerger" when restoring, the tab(s)
 * also need to be removed.
 * @param {object} changes contains the changed keys and they old & new values
 * @param {string} namespace local or sync storage type
 * @param {Function} setTabTotal For re-rendering the total tab counter
 * @param {Function} setGroups For re-rendering the groups
 */
export function openOrRemoveTabs(changes, namespace, setTabTotal, setGroups) {
  if (namespace === "local" && changes?.remove?.newValue?.length > 0) {
    chrome.storage.sync.get("settings", (sync) => {
      chrome.storage.local.get("groups", (local) => {
        // extract and remove the button type from array
        var group_id = changes.remove.newValue[0];
        changes.remove.newValue.splice(0, 1);

        var tabs;
        if (group_id) {
          tabs = local.groups[group_id].tabs;
        } else {
          Object.values(local.groups).forEach((x) => {
            tabs = tabs ? [...tabs, ...x.tabs] : [...x.tabs];
          });
        }

        // try to not open tabs if it is already open
        chrome.tabs.query({ currentWindow: true }, (windowTabs) => {
          for (var i = 0; i < changes.remove.newValue.length; i++) {
            const tab_url = changes.remove.newValue[i];
            const same_tab = AppHelper.findSameTab(windowTabs, tab_url);
            if (same_tab[0] && !same_tab.pinned) {
              chrome.tabs.move(same_tab[0].id, { index: -1 });
            } else {
              const tab_obj = tabs.filter((x) => x.url === tab_url)[0];
              chrome.tabs.create({ pinned: tab_obj.pinned, url: tab_obj.url, active: false }, () => {});
            }
          }

          var groups = local.groups;
          if (sync.settings.restore !== "keep") {
            if (group_id) {
              if (!groups[group_id].locked) {
                groups[group_id].tabs = tabs.filter((x) => !changes.remove.newValue.includes(x.url));
              }
            } else {
              Object.keys(groups).forEach((key) => {
                groups[key].tabs = !groups[key].locked ? [] : groups[key].tabs;
              });
            }

            chrome.storage.local.set({ groups, scroll: document.documentElement.scrollTop }, () => {
              setTabTotal(AppHelper.updateTabTotal(groups));
              setGroups(JSON.stringify(groups));
            });
          }

          // allow reopening same tab
          chrome.storage.local.remove(["remove"], () => {});
        });
      });
    });
  }
}

/**
 * When a merging action is performed, TabMerger checks if Chrome's syncing limits are
 * adhered to before performing the merge. This (in addition to local storage) ensures
 * that TabMerger's data is never lost. If limits are exceeded, the action is canceled
 * and the user is given a warning with instructions.
 * @param {object} changes contains the changed keys and they old & new values
 * @param {string} namespace local or sync storage type
 * @param {number} sync_limit Limit for overall sync storage - includes all groups, tabs, settings, etc.
 * @param {number} item_limit Limit for each group with regards to sync item storage - only contains group related details
 * @param {Function} setTabTotal For re-rendering the total tab counter
 * @param {Function} setGroups For re-rendering the groups
 * @param {Function} setDialog For rendering a warning/error message
 *
 * @see SYNC_STORAGE_LIMIT in App.js
 * @see ITEM_STORAGE_LIMIT in App.js
 */
export function checkMerging(changes, namespace, sync_limit, item_limit, setTabTotal, setGroups, setDialog) {
  if (namespace === "local" && changes?.merged_tabs?.newValue?.length > 0) {
    chrome.storage.sync.get("settings", (sync) => {
      chrome.storage.local.get(["merged_tabs", "into_group", "groups"], (local) => {
        var into_group = local.into_group, merged_tabs = local.merged_tabs; // prettier-ignore
        var group_blocks = local.groups;
        var merged_bytes = JSON.stringify(merged_tabs).length;
        var sync_bytes = JSON.stringify(group_blocks).length + merged_bytes;

        if (sync_bytes < sync_limit) {
          // add new group at top ("merging group") if context menu is used
          // to avoid merging into group with existing tabs
          if (!into_group.includes("group")) {
            into_group = "group-0";
            const group_values = Object.values(group_blocks);
            group_blocks[into_group] = {
              color: sync.settings.color,
              created: AppHelper.getTimestamp(),
              hidden: false,
              locked: false,
              starred: false,
              tabs: [],
              title: sync.settings.title,
            };

            group_values.forEach((val, i) => {
              group_blocks["group-" + (i + 1)] = val;
            });
          }

          var item_bytes = JSON.stringify(group_blocks[into_group]).length + merged_bytes;

          if (item_bytes < item_limit) {
            // close tabs that are being merged (if settings is set to do so)
            if (sync.settings.merge === "merge") {
              chrome.tabs.remove(merged_tabs.map((x) => x.id));
            }

            const new_tabs = [...group_blocks[into_group].tabs, ...merged_tabs];
            group_blocks[into_group].tabs = new_tabs.map((x) => ({ pinned: x.pinned, title: x.title, url: x.url }));

            chrome.storage.local.set({ groups: group_blocks, scroll: document.documentElement.scrollTop }, () => {
              setTabTotal(AppHelper.updateTabTotal(group_blocks));
              setGroups(JSON.stringify(group_blocks));
            });
          } else {
            setDialog({
              show: true,
              title: "⚠ TabMerger Alert ⚠",
              msg: (
                <div>
                  <u>Group's</u> syncing capacity exceeded by <b>{item_bytes - item_limit}</b> bytes.
                  <br />
                  <br />
                  Please do <b>one</b> of the following:
                  <ul style={{ marginLeft: "25px" }}>
                    <li>Create a new group and merge new tabs into it;</li>
                    <li>Remove some tabs from this group;</li>
                    <li>
                      Merge less tabs into this group (each tab is <u>~100-300</u> bytes).
                    </li>
                  </ul>
                </div>
              ),
              accept_btn_text: "OK",
              reject_btn_text: null,
            });
          }
        } else {
          setDialog({
            show: true,
            title: "⚠ TabMerger Alert ⚠",
            msg: (
              <div>
                <u>Total</u> syncing capacity exceeded by <b>{sync_bytes - sync_limit}</b> bytes.
                <br />
                <br />
                Please do <b>one</b> of the following:
                <ul style={{ marginLeft: "25px" }}>
                  <li>Remove some tabs from any group;</li>
                  <li>Delete a group that is no longer needed;</li>
                  <li>
                    Merge less tabs into this group (each tab is <u>~100-300</u> bytes).
                  </li>
                </ul>
                Make sure to Export JSON or PDF to have a backup copy!
              </div>
            ),
            accept_btn_text: "OK",
            reject_btn_text: null,
          });
        }

        // remove to be able to detect changes again (even for same tabs)
        chrome.storage.local.remove(["into_group", "merged_tabs"], () => {});
      });
    });
  }
}

/**
 * Forms the group components with tab draggable tab components inside.
 * Each formed group has correct & up-to-date information.
 * @param {string} groups A stringified object consisting of TabMerger's current group information
 * @param {number} item_limit Limit for each group with regards to sync item storage - only contains group related details
 *
 * @see ITEM_STORAGE_LIMIT in App.js
 *
 * @return If "groups" is defined - array of group components which include the correct number of tab components inside each.
 * Else - null
 */
export function groupFormation(groups, item_limit) {
  if (groups) {
    var parsed_groups = JSON.parse(groups);
    var group_values = Object.values(parsed_groups);
    var sorted_vals = group_values.length > 10 ? AppHelper.sortByKey(parsed_groups) : group_values;

    return sorted_vals.map((x, i) => {
      const id = "group-" + i;
      const textColor = x.color > "#777777" ? "primary" : "light";
      return (
        <Group
          id={id}
          title={x.title || x.name || "Title"}
          color={x.color || "#dedede"}
          created={x.created || AppHelper.getTimestamp()}
          num_tabs={(x.tabs && x.tabs.length) || 0}
          hidden={x.hidden}
          locked={x.locked}
          starred={x.starred}
          key={Math.random()}
        >
          <Tab id={id} item_limit={item_limit} hidden={x.hidden} textColor={textColor} />
        </Group>
      );
    });
  } else {
    return null;
  }
}

/**
 * Allows the user to add a group with the default title & color chosen in the settings.
 * Each new group is always empty and has a creation timestamp. Also scrolls the page
 * down so that the new group is in full view to the user.
 * @param {number} num_group_limit an upper limit on the number of groups that can be created
 * @param {Function} setGroups For re-rendering the groups
 * @param {Function} setDialog For rendering a warning/error message
 *
 * @see NUM_GROUP_LIMIT in App.js
 */
export function addGroup(num_group_limit, setGroups, setDialog) {
  chrome.storage.local.get("groups", (local) => {
    var current_groups = local.groups;
    var num_keys = Object.keys(current_groups).length;

    if (num_keys < num_group_limit) {
      chrome.storage.sync.get("settings", (sync) => {
        current_groups["group-" + num_keys] = {
          color: sync.settings.color,
          created: AppHelper.getTimestamp(),
          hidden: false,
          locked: false,
          starred: false,
          tabs: [],
          title: sync.settings.title,
        };
        chrome.storage.local.set({ groups: current_groups, scroll: document.body.scrollHeight }, () => {
          setGroups(JSON.stringify(current_groups));
        });
      });
    } else {
      setDialog({
        show: true,
        title: "⚠ TabMerger Alert ⚠",
        msg: (
          <div>
            Number of groups exceeded (more than <b>100</b>).
            <br />
            <br />
            Please do <b>one</b> of the following:
            <ul style={{ marginLeft: "25px" }}>
              <li>Delete a group that is no longer needed;</li>
              <li>Merge tabs into another existing group.</li>
            </ul>
          </div>
        ),
        accept_btn_text: "OK",
        reject_btn_text: null,
      });
    }
  });
}

/**
 * Sets Chrome's local storage with an array ([null, ... url_links ...]) consisting
 * of all the tabs in TabMerger to consider for removal.
 *
 * @param {HTMLElement} e Representing the Open All button
 * @param {Function} setDialog For rendering a warning/error message
 */
export function openAllTabs(e, setDialog) {
  var element = e.target.closest("#open-all-btn");
  AppHelper.elementMutationListener(element, (mutation) => {
    if (mutation.type === "attributes" && element.getAttribute("response") === "positive") {
      var tab_links = [...document.querySelectorAll(".a-tab")].map((x) => x.href);
      tab_links.unshift(null);
      chrome.storage.local.set({ remove: tab_links }, () => {});
    }
  });

  setDialog({
    element,
    show: true,
    title: "✔ TabMerger Confirmation Request ❌",
    msg: (
      <div>
        Are you sure you want to open <b>ALL</b> your tabs at once?
        <br />
        <br></br>We do <b>not</b> recommend opening <u>more than 100 tabs</u> at once as it may overload your system!
      </div>
    ),
    accept_btn_text: "YES, OPEN ALL",
    reject_btn_text: "CANCEL",
  });
}

/**
 * Allows the user to delete every UNLOCKED group (including tabs) inside TabMerger.
 * A default group is formed above all locked groups to allow for re-merging after deletion.
 * The default group has title & color matching settings parameter and a creation timestamp.
 *
 * @param {HTMLElement} e Button corresponding to the delete all operation
 * @param {Function} setTabTotal For re-rendering the total tab counter
 * @param {Function} setGroups For re-rendering the groups
 * @param {Function} setDialog For rendering the confirmation dialog
 */
export function deleteAllGroups(e, setTabTotal, setGroups, setDialog) {
  const scroll = document.documentElement.scrollTop;
  var element = e.target.closest("#delete-all-btn");
  AppHelper.elementMutationListener(element, (mutation) => {
    if (mutation.type === "attributes" && element.getAttribute("response") === "positive") {
      chrome.storage.local.get(["groups", "groups_copy"], (local) => {
        chrome.storage.sync.get("settings", (sync) => {
          var { groups_copy, groups } = local;
          groups_copy = AppHelper.storeDestructiveAction(groups_copy, groups);

          groups = {};
          var locked_counter = 0;
          document.querySelectorAll(".group-item").forEach((x) => {
            if (x.querySelector(".lock-group-btn span").textContent.includes(translate("unlock"))) {
              groups["group-" + locked_counter] = {
                color: x.querySelector("input[type='color']").value,
                created: x.querySelector(".created span").textContent,
                hidden: !!x.querySelector(".hidden-symbol"),
                locked: true,
                starred: x.querySelector(".star-group-btn span").textContent.includes(translate("unstar")),
                tabs: [...x.querySelectorAll(".draggable")].map((tab) => {
                  const a = tab.querySelector("a");
                  return { pinned: !!tab.querySelector(".pinned"), title: a.textContent, url: a.href };
                }),
                title: x.querySelector(".title-edit-input").value,
              };

              locked_counter++;
            }
          });

          groups["group-" + locked_counter] = {
            color: sync.settings.color,
            created: AppHelper.getTimestamp(),
            hidden: false,
            locked: false,
            starred: false,
            tabs: [],
            title: sync.settings.title,
          };

          chrome.storage.local.set({ groups, groups_copy, scroll }, () => {
            setTabTotal(AppHelper.updateTabTotal(groups));
            setGroups(JSON.stringify(groups));
          });
        });
      });
    }
  });

  setDialog({
    element,
    show: true,
    title: "✔ TabMerger Confirmation Request ❌",
    msg: (
      <div>
        Are you sure?
        <br />
        <br />
        This action will delete <b>ALL</b> groups/tabs that are <u>not locked</u>.<br />
        <br />
        Make sure you have a backup!
      </div>
    ),
    accept_btn_text: "YES, DELETE ALL",
    reject_btn_text: "CANCEL",
  });
}

/**
 * If a user accidently removes a tab, group, or everything. They can press the "Undo"
 * button to restore the previous configuration.
 *
 * @param {Function} setGroups For re-rendering the groups after they are reset
 * @param {Function} setTabTotal For re-rendering the tab total counter
 * @param {Function} setDialog For rendering a warning/error message
 *
 * @note Up to 10 states are stored.
 */
export function undoDestructiveAction(setGroups, setTabTotal, setDialog) {
  chrome.storage.local.get(["groups", "groups_copy"], (local) => {
    if (local.groups_copy.length >= 1) {
      const scroll = document.documentElement.scrollTop;
      const prev_group = local.groups_copy.pop();

      chrome.storage.local.set({ groups: prev_group, groups_copy: local.groups_copy, scroll }, () => {
        setTabTotal(AppHelper.updateTabTotal(prev_group));
        setGroups(JSON.stringify(prev_group));
      });
    } else {
      setDialog({
        show: true,
        title: "❕ TabMerger Information ❕",
        msg: (
          <div>
            There are <b>no more</b> states to undo. <br />
            <br />
            States are created with <u>destructive actions</u>!
          </div>
        ),
        accept_btn_text: "OK",
        reject_btn_text: null,
      });
    }
  });
}

/**
 * Allows the user to drag and drop an entire group with tabs inside.
 * @param {HTMLElement} e The group node being dragged.
 * @param {string} type Either group or tab, corresponding to the dragging operation.
 *
 */
export function dragOver(e, type) {
  const currentElement = document.querySelector(type === "group" ? ".dragging-group" : ".dragging");
  if (currentElement) {
    e.preventDefault();
    var group_block = e.target.closest(".group");
    var location = type === "group" ? e.target.closest("#tabmerger-container") : group_block.querySelector(".tabs-container"); // prettier-ignore
    const afterElement = AppHelper.getDragAfterElement(type === "group" ? location : group_block, e.clientY, type);
    !afterElement ? location?.appendChild(currentElement) : location?.insertBefore(currentElement, afterElement);

    // allow scrolling while dragging with a 10px offset from top/bottom
    const offset = 10;
    if (e.clientY < offset || e.clientY > window.innerHeight - offset) {
      window.scrollTo(0, e.clientY);
    }
  }
}

/**
 * Allows the user to search for groups or tabs within TabMerger using a filter.
 * The filter is case-insensitive and updates the groups in real time as the user types.
 * This action is non-persistent and will reset once the page reloads or a re-render occurs.
 * Tabs/Groups are simply hidden from the user once a filter is applied, that is they are not
 * removed from TabMerger and thus the counts (group and global) are not updated.
 *
 * @example
 * #TabMerger ➡ "Group Level Search (by group title)"
 * TabMerger ➡ "Tab Level Search (by tab title)"
 *
 * @param {HTMLElement} e Node corresponding to the search filter
 */
export function regexSearchForTab(e) {
  var sections = document.querySelectorAll(".group-item");
  var tab_items = [...sections].map((x) => [...x.querySelectorAll(".draggable")]);

  var titles, match;
  if (e.target.value[0] === "#") {
    // GROUP
    titles = [...sections].map((x) => x.querySelector(".title-edit-input").value);
    match = e.target.value.substr(1).toLowerCase();
    titles.forEach((x, i) => (sections[i].style.display = x.toLowerCase().indexOf(match) === -1 ? "none" : ""));
  } else if (e.target.value.length > 0) {
    // TAB
    titles = tab_items.map((x) => x.map((y) => y.querySelector(".a-tab").textContent.toLowerCase()));
    match = e.target.value.toLowerCase();

    titles.forEach((title, i) => {
      if (title.some((x) => x.indexOf(match) !== -1)) {
        sections[i].style.display = "";
        title.forEach((x, j) => (tab_items[i][j].style.display = x.indexOf(match) === -1 ? "none" : ""));
      } else {
        sections[i].style.display = "none";
        tab_items[i].forEach((x) => (x.style.display = "none"));
      }
    });
  } else {
    // NO TYPING - show all groups and tabs
    sections.forEach((x) => (x.style.display = ""));
    tab_items.forEach((tabs) => tabs.forEach((tab) => (tab.style.display = "")));
  }
}

/**
 * Clears the tab search input field when the user exits it (onBlur).
 * Additionally, this will undo the search operation and display all the tabs & groups.
 * @param {HTMLElement} e Node corresponding to the tab search filter
 *
 * @note The timeout is added to allow operations like opening a tab
 */
export function resetSearch(e) {
  setTimeout(() => {
    e.target.value = "";
    regexSearchForTab(e);
  }, 100);
}

/**
 * Allows the user to import a JSON file which they exported previously.
 * This JSON file contains TabMerger's configuration and once uploaded
 * overwrites the current configuration. Checks are made to ensure a JSON
 * file is uploaded.
 * @param {HTMLElement} e Node corresponding to the input file field
 * @param {Function} setGroups For re-rendering the groups
 * @param {Function} setTabTotal For re-rendering the total tab counter
 * @param {Function} setDialog For rendering a warning/error message
 */
export function importJSON(e, setGroups, setTabTotal, setDialog) {
  if (e.target.files[0].type === "application/json") {
    chrome.storage.local.get(["groups", "groups_copy"], (local) => {
      const groups_copy = AppHelper.storeDestructiveAction(local.groups_copy, local.groups);
      const scroll = document.documentElement.scrollTop;

      var reader = new FileReader();
      reader.readAsText(e.target.files[0]);
      reader.onload = () => {
        var fileContent = JSON.parse(reader.result);

        chrome.storage.sync.set({ settings: fileContent.settings }, () => {
          delete fileContent.settings;
          chrome.storage.local.set({ groups: fileContent, groups_copy, scroll }, () => {
            e.target.value = ""; // reset the file input so it can trigger again
            setGroups(JSON.stringify(fileContent));
            setTabTotal(AppHelper.updateTabTotal(fileContent));
          });
        });
      };
    });
  } else {
    setDialog({
      show: true,
      title: <p><span style={{color: "red"}}>‼</span> TabMerger Warning <span Warning span style={{color: "red"}}>‼</span></p>, // prettier-ignore
      msg: (
        <div>
          You must import a JSON file <i>(.json extension)</i>!<br />
          <br />
          These can be generated via the <b>Export JSON</b> button.
          <br />
          <br />
          <b>Be careful</b>, <u>only import JSON files generated by TabMerger</u>, otherwise you risk losing your
          current configuration!
        </div>
      ),
      accept_btn_text: "OK",
      reject_btn_text: null,
    });
  }
}

/**
 * Allows the user to export TabMerger's current configuration (including settings).
 */
export function exportJSON() {
  chrome.storage.local.get("groups", (local) => {
    var group_blocks = local.groups;
    chrome.storage.sync.get("settings", (sync) => {
      group_blocks["settings"] = sync.settings;

      var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(group_blocks, null, 2));

      var anchor = document.createElement("a");
      anchor.setAttribute("href", dataStr);
      anchor.setAttribute("download", AppHelper.outputFileName() + ".json");
      anchor.click();
      anchor.remove();
    });
  });
}

/**
 * On different browsers, this generates the corresponding link to the browser's webstore
 * where TabMerger can be downloaded.
 * @param {boolean} reviews Whether or not the link should be to a reviews page
 *
 * @return A URL link to TabMerger's webstore (or reviews) page
 */
export function getTabMergerLink(reviews) {
  var link;
  var isFirefox = typeof InstallTrigger !== "undefined";
  var isChrome = !!chrome && !!chrome.runtime;
  var isEdge = isChrome && navigator.userAgent.indexOf("Edg") !== -1;

  if (isEdge) {
    link = "https://microsoftedge.microsoft.com/addons/detail/tabmerger/eogjdfjemlgmbblgkjlcgdehbeoodbfn";
  } else if (isFirefox) {
    link = "https://addons.mozilla.org/en-CA/firefox/addon/tabmerger";
  } else if (isChrome) {
    link = "https://chrome.google.com/webstore/detail/tabmerger/inmiajapbpafmhjleiebcamfhkfnlgoc";
  }

  if (reviews && !isFirefox) {
    link += "/reviews/";
  }

  return link;
}

/**
 * Checks if a translation for a specific key is available and returns the translation.
 * @param {string} msg The key specified in the "_locales" folder corresponding to a translation from English
 *
 * @see ```./public/_locales/``` For key/value translation pairs
 *
 * @return {string} If key exists - translation from English to the corresponding language (based on user's Chrome Language settings),
 * Else - the original message
 *
 */
export function translate(msg) {
  try {
    return chrome.i18n.getMessage(msg);
  } catch (err) {
    return msg;
  }
}
