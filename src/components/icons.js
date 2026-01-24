import { h } from "vue";

export const IconMenu = (props, { attrs }) => {
  const p = Object.assign(
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    attrs,
  );
  return h("svg", p, [
    h("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
    h("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
    h("line", { x1: "4", y1: "18", x2: "20", y2: "18" }),
  ]);
};

export const IconSend = (props, { attrs }) => {
  const p = Object.assign(
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    attrs,
  );
  return h("svg", p, [
    h("line", { x1: "22", y1: "2", x2: "11", y2: "13" }),
    h("polygon", { points: "22 2 15 22 11 13 2 9 22 2" }),
  ]);
};

export const IconClose = (props, { attrs }) => {
  const p = Object.assign(
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "20",
      height: "20",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    attrs,
  );
  return h("svg", p, [
    h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
    h("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
  ]);
};

export const IconPlus = (props, { attrs }) => {
  const p = Object.assign(
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    attrs,
  );
  return h("svg", p, [
    h("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
    h("line", { x1: "5", y1: "12", x2: "19", y2: "12" }),
  ]);
};

export const IconChat = (props, { attrs }) => {
  const p = Object.assign(
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    attrs,
  );
  return h("svg", p, [
    h("path", {
      d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    }),
  ]);
};

export const IconTrash = (props, { attrs }) => {
  const p = Object.assign(
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "14",
      height: "14",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    attrs,
  );
  return h("svg", p, [
    h("polyline", { points: "3 6 5 6 21 6" }),
    h("path", {
      d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    }),
  ]);
};

export default {
  IconMenu,
  IconSend,
  IconClose,
  IconPlus,
  IconChat,
  IconTrash,
};
