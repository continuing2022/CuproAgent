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

export default {
  IconMenu,
  IconSend,
};
