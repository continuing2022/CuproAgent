import { h } from "vue";

const svgAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
};

function createIcon(size, shapes) {
  return (_, { attrs }) =>
    h(
      "svg",
      { ...svgAttributes, width: size, height: size, ...attrs },
      shapes.map(([tag, attributes]) => h(tag, attributes)),
    );
}

export const IconMenu = createIcon("24", [
  ["line", { x1: "4", y1: "6", x2: "20", y2: "6" }],
  ["line", { x1: "4", y1: "12", x2: "20", y2: "12" }],
  ["line", { x1: "4", y1: "18", x2: "20", y2: "18" }],
]);
export const IconSend = createIcon("18", [
  ["line", { x1: "22", y1: "2", x2: "11", y2: "13" }],
  ["polygon", { points: "22 2 15 22 11 13 2 9 22 2" }],
]);
export const IconClose = createIcon("20", [
  ["line", { x1: "18", y1: "6", x2: "6", y2: "18" }],
  ["line", { x1: "6", y1: "6", x2: "18", y2: "18" }],
]);
export const IconPlus = createIcon("18", [
  ["line", { x1: "12", y1: "5", x2: "12", y2: "19" }],
  ["line", { x1: "5", y1: "12", x2: "19", y2: "12" }],
]);
export const IconChat = createIcon("16", [
  [
    "path",
    { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  ],
]);
export const IconTrash = createIcon("14", [
  ["polyline", { points: "3 6 5 6 21 6" }],
  [
    "path",
    {
      d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    },
  ],
]);
export const IconEdit = createIcon("14", [
  ["path", { d: "M12 20h9" }],
  ["path", { d: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" }],
]);
export const IconStop = createIcon("18", [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["rect", { x: "9", y: "9", width: "6", height: "6", rx: "1" }],
]);
