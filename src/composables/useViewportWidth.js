import { onMounted, onUnmounted, ref } from "vue";

export function useViewportWidth(initialWidth = 1024) {
  const width = ref(initialWidth);
  const update = () => {
    width.value = window.innerWidth;
  };
  onMounted(() => {
    update();
    window.addEventListener("resize", update);
  });
  onUnmounted(() => window.removeEventListener("resize", update));
  return width;
}
