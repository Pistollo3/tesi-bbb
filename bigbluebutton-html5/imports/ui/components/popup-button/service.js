/*eslint-disable*/
import logger from "../../../startup/client/logger";

function getFullscreenElement() {
  if (document.fullscreenElement) return document.fullscreenElement;
  if (document.webkitFullscreenElement) return document.webkitFullscreenElement;
  if (document.mozFullScreenElement) return document.mozFullScreenElement;
  if (document.msFullscreenElement) return document.msFullscreenElement;
  return null;
}

const isReduced = (element) => {
  return true;
};

function cancelFullScreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}



function fullscreenRequest(element) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
    element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

const toggleFullScreen = (ref = null) => {
  const element = ref || document.documentElement;


};

export default {
  toggleFullScreen,
  isReduced,
};
