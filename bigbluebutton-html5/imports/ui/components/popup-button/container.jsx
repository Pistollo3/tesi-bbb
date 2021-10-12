import React from 'react';
import PopupButtonComponent from './component';

const PopupButtonContainer = props => <PopupButtonComponent {...props} />;

export default (props) => {
  const isIphone = (navigator.userAgent.match(/iPhone/i)) ? true : false;
  return (
    <PopupButtonContainer {...props} {...{ isIphone }} />
  );
};
