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

import React, { useEffect, useContext } from "react";
import * as CONSTANTS from "../../constants/constants";

import * as GroupFunc from "./Group_functions";
import { translate, dragOver } from "../App/App_functions";
import { AppContext } from "../../context/AppContext";

import MergeBtns from "../Button/MergeBtns";
import GroupTitleBtns from "../Button/GroupTitleBtns";

import { BiHide } from "react-icons/bi";

import "./Group.css";
import "../Button/Button.css";

export default function Group({
  id,
  title,
  textColor,
  color,
  created,
  num_tabs,
  hidden,
  locked,
  starred,
  fontFamily,
  children,
}) {
  const { user, setTabTotal, setGroups } = useContext(AppContext);

  useEffect(() => GroupFunc.setBGColor(document.getElementById(id), id), [id]);

  return (
    <div
      className={"group-item mt-2" + (hidden ? " hidden" : "") + (num_tabs > 0 ? "" : " empty")}
      draggable={true}
      onDragStart={(e) => GroupFunc.groupDragStart(e)}
      onDragEnd={(e) => GroupFunc.groupDragEnd(e)}
    >
      <div className="group-title d-flex flex-row justify-content-center" draggable={false} style={{ fontFamily }}>
        <h5 className="group-count">{num_tabs}</h5>

        <input
          className="title-edit-input font-weight-bold mb-0"
          title="can be modified to give the group a meaningful name"
          maxLength={CONSTANTS.TITLE_TRIM_LIMIT}
          defaultValue={title}
          onFocus={(e) => e.target.select()}
          onBlur={(e) => GroupFunc.setTitle(e)}
          onKeyDown={(e) => GroupFunc.blurOnEnter(e)}
          onDragStart={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        />

        <GroupTitleBtns
          id={id}
          color={color}
          hidden={hidden}
          locked={locked}
          starred={starred}
          user={user}
          textColor={textColor}
          setTabTotal={setTabTotal}
          setGroups={setGroups}
        />
      </div>

      <div id={id} className="group draggable-group" draggable={false} onDragOver={(e) => dragOver(e, "tab")}>
        <div className="created mr-1" draggable={false} style={{ fontFamily }}>
          <b>{translate("created")}:</b> <span>{created}</span>
        </div>

        <div className="sync-group-exceed-indicator d-none" title="indicates that the group's sync limit is exceeded">
          ●
        </div>

        <input
          className="url-drag-input"
          type="text"
          name="url-drag"
          onChange={(e) => GroupFunc.addTabFromURL(e, user, setGroups, setTabTotal)}
          onKeyDown={(e) => e.preventDefault()}
          onClick={(e) => e.target.blur()}
        />

        <MergeBtns id={id} />

        {hidden && <BiHide className="hidden-symbol" color="black" size="1.6rem" />}
        {children}
      </div>
    </div>
  );
}
